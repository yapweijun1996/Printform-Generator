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
  htmlValidationTool,
  visualReviewTool,
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
import { buildPrintformSopRagBlock } from './printformSop';
import { buildAutoPrintSafeBlock } from './agentAugmenters/autoPrintSafe';
import { buildImageNote, hasAnyImages, pushLabeledImageParts, type GeminiImageInputs } from './gemini/imageContext';
import { SemanticRag } from './rag';

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
  // Prefer native function calling; fallback to JSON-directive when the model/tooling doesn't support it.
  private toolMode: ToolMode = 'function_calling';
  private semanticRagEnabled: boolean;
  private semanticRagTopK: number;
  private semanticRag: SemanticRag | null = null;

  constructor(
    apiKey: string,
    modelName: string = 'gemini-3-pro-preview',
    activeTools: string[] = [],
    pageWidth: string = '750px',
    pageHeight: string = '1050px',
    opts?: { semanticRagEnabled?: boolean; semanticRagTopK?: number },
  ) {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.activeTools = activeTools;
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
    this.semanticRagEnabled = Boolean(opts?.semanticRagEnabled);
    this.semanticRagTopK = Number.isFinite(opts?.semanticRagTopK)
      ? Math.max(1, Math.min(8, Number(opts?.semanticRagTopK)))
      : 4;

    if (this.semanticRagEnabled && this.apiKey) {
      this.semanticRag = new SemanticRag({ apiKey: this.apiKey });
    }

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
    if (this.activeTools.includes('html_validation')) functionDeclarations.push(htmlValidationTool);
    if (this.activeTools.includes('visual_review')) functionDeclarations.push(visualReviewTool);
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
    images?: GeminiImageInputs,
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

      const clip = (s: string, max: number) => {
        const text = String(s || '');
        if (text.length <= max) return text;
        return text.slice(0, Math.max(0, max)) + '\n... (truncated)\n';
      };

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
      const planContextForModel = planContext ? clip(planContext, 2200) : '';

      // Keep model context bounded to avoid request-size failures.
      const currentFileContextForModel = clip(currentFileContext, 14000);

      const hasImages = hasAnyImages(images);
      const imageNote = buildImageNote(images);

      // 检查消息类型:新用户请求 或 函数响应
      if (typeof message === 'string') {
        const sopRagBlock = buildPrintformSopRagBlock(message);
        let semanticRagBlock = '';
        if (this.semanticRagEnabled && this.semanticRag) {
          try {
            // Timeout: 如果 embedding API 不可用，5 秒后放弃
            const ragPromise = this.semanticRag.buildRagBlock({ query: message, topK: this.semanticRagTopK });
            const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve(''), 5000));
            semanticRagBlock = await Promise.race([ragPromise, timeoutPromise]) || '';
          } catch {
            semanticRagBlock = '';
          }
        }
        const groundingBlock = (semanticRagBlock || sopRagBlock).trim();
        const autoPrintSafeBlock = buildAutoPrintSafeBlock({
          currentFileContext,
          pageWidth: this.pageWidth,
          pageHeight: this.pageHeight,
        });

        // --- 用户请求 ---
        const promptWithContext = `
[RAG CONTEXT START]
${[groundingBlock, autoPrintSafeBlock].filter(Boolean).join('\n\n')}
[RAG CONTEXT END]

[CURRENT FILE CONTEXT START]
${currentFileContextForModel}
[CURRENT FILE CONTEXT END]
${planContextForModel}

Preflight protocol (MANDATORY):
0) Review [AUTO_GROUNDING] (if present) for template/validator hints.
1) Review the latest preview snapshot image (if provided).
   - If both a reference image and a current preview image are provided, compare them and report [VISUAL DIFF] before deciding changes.
2) Review the CURRENT FILE CONTEXT.
3) Identify the CURRENT TASK from the plan (if any).
4) Only then decide the next minimal change.

        User Request: ${message}
`;

        if (hasImages) {
          pushLabeledImageParts(messageParts, images);

          // 如果用户只发送图片没有文字,假设需要复制
          const visualPrompt = !message.trim()
            ? `
[RAG CONTEXT START]
${[groundingBlock, autoPrintSafeBlock].filter(Boolean).join('\n\n')}
[RAG CONTEXT END]

[CURRENT FILE CONTEXT START]
${currentFileContextForModel}
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
          const sopRagBlock = buildPrintformSopRagBlock(`${name}\n${result}`);
          const autoPrintSafeBlock = buildAutoPrintSafeBlock({
            currentFileContext,
            pageWidth: this.pageWidth,
            pageHeight: this.pageHeight,
          });
          const toolResultText = `
[RAG CONTEXT START]
${[sopRagBlock, autoPrintSafeBlock].filter(Boolean).join('\n\n')}
[RAG CONTEXT END]

[CURRENT FILE CONTEXT START]
${currentFileContextForModel}
[CURRENT FILE CONTEXT END]
${planContextForModel}

ToolResult (${name}): success=${success}
${result}

Instruction: If there are PENDING tasks, proceed to the next one immediately.
	If you need to act, output ONE <TOOL_CALL>{...}</TOOL_CALL> at the end.
`;
          if (hasImages) {
            pushLabeledImageParts(messageParts, images);
            messageParts.push({ text: imageNote });
          }
          messageParts.push({ text: toolResultText });
        } else {
          // function_calling 模式: functionResponse 必须是纯净的，不能附加图片或文本
          // Gemini API 要求 function_response 紧跟在 function_call 之后，不能有其他内容
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
