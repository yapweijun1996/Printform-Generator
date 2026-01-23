/**
 * Gemini 服务相关的类型定义
 */

/**
 * 工具模式
 * - function_calling: 使用原生 Function Calling API
 * - json_directive: 使用 JSON 指令回退模式(当模型不支持 Function Calling 时)
 */
export type ToolMode = 'function_calling' | 'json_directive';

/**
 * Gemini 服务配置选项
 */
export interface GeminiServiceConfig {
  /** Gemini API Key */
  apiKey: string;
  /** 模型名称 */
  modelName?: string;
  /** 启用的工具列表 */
  activeTools?: string[];
  /** 页面宽度 */
  pageWidth?: string;
  /** 页面高度 */
  pageHeight?: string;
}

/**
 * 消息发送选项
 */
export interface SendMessageOptions {
  /** 用户消息或函数响应 */
  message: string | any[];
  /** 当前文件上下文 */
  currentFileContext: string;
  /** 可选的图片数据 */
  image?: {
    mimeType: string;
    data: string;
  };
  /** 当前任务列表 */
  currentTasks?: any[];
}
