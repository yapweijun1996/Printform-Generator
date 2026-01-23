import { GoogleGenAI, Chat, FunctionDeclaration, Tool, Part } from '@google/genai';
import { AgentTask } from '../types';
import {
  modifyCodeTool,
  insertContentTool,
  managePlanTool,
  undoLastTool,
  readFileTool,
  readAllFilesTool,
  grepSearchTool,
  diffCheckTool,
  printSafeValidatorTool,
  loadReferenceTemplateTool,
} from './gemini/toolDefinitions';
import {
  BASE_SYSTEM_INSTRUCTION,
  VISION_INSTRUCTION,
  TOOL_FALLBACK_INSTRUCTION,
  EXPLAIN_CODE_INSTRUCTION,
  getConfigurationInstruction,
} from './gemini/systemInstructions';
import { ToolMode } from './gemini/types';

/**
 * Gemini AI 服务类
 * 负责与 Google Gemini API 的交互和会话管理
 */
export class GeminiService {
  private chat: Chat | null = null;
  private apiKey: string;
  private modelName: string;
  private activeTools: string[];
  private pageWidth: string;
  private pageHeight: string;
  // Use JSON-directive tool mode by default to avoid function-call turn ordering issues.
  // The model is instructed to output <TOOL_CALL>{...}</TOOL_CALL> blocks that we parse and execute locally.
  private toolMode: ToolMode = 'json_directive';

  constructor(
    apiKey: string,
    modelName: string = 'gemini-3-pro-preview',
    activeTools: string[] = [],
    pageWidth: string = '750px',
    pageHeight: string = '1050px',
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.activeTools = activeTools;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;

    if (this.apiKey) {
      this.initializeChat();
    }
  }

  /**
   * 初始化聊天会话
   * 根据配置动态构建工具和系统指令
   */
  private initializeChat() {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });

    // 动态工具构建
    const functionDeclarations: FunctionDeclaration[] = [managePlanTool]; // Plan tool 始终启用
    const toolConfig: Tool[] = [];

    let systemInstruction = BASE_SYSTEM_INSTRUCTION;

    // 注入页面尺寸配置
    systemInstruction += getConfigurationInstruction(this.pageWidth, this.pageHeight);

    // 1. 核心编辑工具
    if (this.activeTools.includes('code_replace') || this.activeTools.includes('code_rewrite')) {
      functionDeclarations.push(modifyCodeTool);
    }

    if (this.activeTools.includes('code_insert')) {
      functionDeclarations.push(insertContentTool);
    }

    // 2. Local grounding & safety tools (frontend-only)
    if (this.activeTools.includes('read_file')) functionDeclarations.push(readFileTool);
    if (this.activeTools.includes('read_all_files')) functionDeclarations.push(readAllFilesTool);
    if (this.activeTools.includes('grep_search')) functionDeclarations.push(grepSearchTool);
    if (this.activeTools.includes('diff_check')) functionDeclarations.push(diffCheckTool);
    if (this.activeTools.includes('undo_last')) functionDeclarations.push(undoLastTool);
    if (this.activeTools.includes('print_safe_validator')) functionDeclarations.push(printSafeValidatorTool);
    if (this.activeTools.includes('load_reference_template')) functionDeclarations.push(loadReferenceTemplateTool);

    // Always push function declarations if they exist
    if (functionDeclarations.length > 0) {
      toolConfig.push({ functionDeclarations });
    }

    if (this.toolMode === 'json_directive') {
      // 工具回退模式 - 额外加强提示词
      systemInstruction += TOOL_FALLBACK_INSTRUCTION;
    }

    // 视觉分析能力
    if (this.activeTools.includes('image_analysis')) {
      systemInstruction += `\n\n${VISION_INSTRUCTION}`;
    }

    // 代码解释模式
    if (this.activeTools.includes('explain_code')) {
      systemInstruction += EXPLAIN_CODE_INSTRUCTION;
    }

    this.chat = ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction: systemInstruction,
        tools: toolConfig,
        temperature: 0.2, // 低温度以提高代码精确度
      },
    });
  }

  /**
   * 发送消息流
   * @param message 用户消息或函数响应
   * @param currentFileContext 当前文件上下文
   * @param image 可选的图片数据
   * @param currentTasks 当前任务列表
   */
  async sendMessageStream(
    message: string | Part[],
    currentFileContext: string,
    images?: Array<{ mimeType: string; data: string }>,
    currentTasks: AgentTask[] = [],
  ): Promise<any> {
    if (!this.chat) {
      if (!this.apiKey) {
        throw new Error('API Key is missing. Please set it in Settings.');
      }
      this.initializeChat();
    }

    try {
      let messageParts: any[] = [];

      // 构建任务计划上下文
      let planContext = '';
      if (currentTasks.length > 0) {
        planContext = '\n[CURRENT PLAN STATUS]:\n';
        currentTasks.forEach((t, i) => {
          planContext += `${i}. [${t.status.toUpperCase()}] ${t.description}\n`;
        });
        const inProgressIdx = currentTasks.findIndex((t) => t.status === 'in_progress');
        if (inProgressIdx >= 0) {
          planContext += `\n[CURRENT TASK]: #${inProgressIdx + 1} ${currentTasks[inProgressIdx].description}\n`;
        }
        planContext += '\nInstruction: If there are PENDING tasks, proceed to the next one immediately.\n';
      }

      // 检查消息类型:新用户请求 或 函数响应
      if (typeof message === 'string') {
        // --- 用户请求 ---
        const promptWithContext = `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]
${planContext}

Preflight protocol (MANDATORY):
1) Review the latest preview snapshot image (if provided).
2) Review the CURRENT FILE CONTEXT.
3) Identify the CURRENT TASK from the plan (if any).
4) Only then decide the next minimal change.

User Request: ${message}
`;

        const hasImages = Array.isArray(images) && images.length > 0;
        if (hasImages) {
          images.forEach((img) => {
            messageParts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.data,
              },
            });
          });

          const imageNote = `
[IMAGE CONTEXT]
- Image 1: Reference image (target layout/style).
- Image 2 (if present): Current preview snapshot (after latest change). Use it to verify progress and avoid regressions.
`;

          // 如果用户只发送图片没有文字,假设需要复制
          const visualPrompt = !message.trim()
            ? `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]

User Request: Analyze the attached images and reproduce the reference design using STRICT HTML Tables with <colgroup> logic. Use INLINE STYLES.
${imageNote}
              `
            : `${promptWithContext}\n${imageNote}\n(Note: Use the attached images as the primary visual reference for this request).`;

          messageParts.push({ text: visualPrompt });
        } else {
          messageParts.push({ text: promptWithContext });
        }
      } else {
        // --- 函数响应(内部循环) ---
        // 在回退模式下,将结构化的 functionResponse 转换为纯文本
        if (this.toolMode === 'json_directive') {
          const first = (message as any[])[0];
          const fr = first?.functionResponse;
          const name = fr?.name || 'tool';
          const result = fr?.response?.result ?? '';
          const success = fr?.response?.success ?? false;
          const toolResultText = `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]
${planContext}

ToolResult (${name}): success=${success}
${result}

Instruction: If there are PENDING tasks, proceed to the next one immediately.
	If you need to act, output ONE <TOOL_CALL>{...}</TOOL_CALL> at the end.
`;
          const hasImages = Array.isArray(images) && images.length > 0;
          if (hasImages) {
            images.forEach((img) => {
              messageParts.push({
                inlineData: {
                  mimeType: img.mimeType,
                  data: img.data,
                },
              });
            });
          }
          messageParts.push({ text: toolResultText });
        } else {
          messageParts = message;
        }
      }

      // 发送消息流
      return await this.chat!.sendMessageStream({ message: messageParts });
    } catch (error) {
      const errText = (error as any)?.message || '';
      const isToolUnsupported =
        (error as any)?.code === 400 &&
        typeof errText === 'string' &&
        errText.includes('Tool use with function calling is unsupported');

      if (isToolUnsupported && this.toolMode === 'function_calling') {
        // 自动回退:重新初始化为 JSON 指令模式并重试
        this.toolMode = 'json_directive';
        this.chat = null;
        this.initializeChat();
        return await this.sendMessageStream(message, currentFileContext, images, currentTasks);
      }

      console.error('Gemini API Error:', error);
      throw error;
    }
  }
}
