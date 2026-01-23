
import { GoogleGenAI, Chat, FunctionDeclaration, Type, Tool, Part } from "@google/genai";
import { AgentTask } from '../types';

// Define the "IDE" tools
const modifyCodeTool: FunctionDeclaration = {
  name: 'modify_code',
  description: 'Modify the code. Use "replace" for small edits (search & replace) and "rewrite" ONLY for full file restructuring.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      operation: {
        type: Type.STRING,
        enum: ['replace', 'rewrite'],
        description: 'Use "replace" to find and replace a snippet. Use "rewrite" ONLY if you need to change >50% of the file.',
      },
      search_snippet: {
        type: Type.STRING,
        description: 'Exact string to find in the existing code. REQUIRED if operation is "replace". Must match character-for-character.',
      },
      new_code: {
        type: Type.STRING,
        description: 'The new code to insert. If operation is "rewrite", this is the full file content.',
      },
      change_description: {
        type: Type.STRING,
        description: 'A short summary of what changed (e.g., "Added tax column"). Used for the Audit Log.',
      },
    },
    required: ['operation', 'new_code', 'change_description'],
  },
};

const insertContentTool: FunctionDeclaration = {
  name: 'insert_content',
  description: 'Insert new code/tags before or after a specific snippet. Best for adding new columns, rows, or styles without rewriting.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      target_snippet: {
        type: Type.STRING,
        description: 'The existing code snippet to use as an anchor/reference point.',
      },
      position: {
        type: Type.STRING,
        enum: ['before', 'after'],
        description: 'Where to insert the new code relative to the target_snippet.',
      },
      new_code: {
        type: Type.STRING,
        description: 'The new HTML/CSS code to insert.',
      },
      change_description: {
        type: Type.STRING,
        description: 'A short summary of what changed (e.g., "Added footer row"). Used for the Audit Log.',
      },
    },
    required: ['target_snippet', 'position', 'new_code', 'change_description'],
  },
};

const managePlanTool: FunctionDeclaration = {
  name: 'manage_plan',
  description: 'Manage the Task List. Use this to break down complex user requests into steps, or update the status of tasks as you complete them.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        enum: ['create_plan', 'mark_completed', 'mark_in_progress', 'mark_failed', 'add_task'],
        description: 'create_plan: Overwrites list. mark_in_progress: Set status to running. mark_completed: Set status to done. mark_failed: Set status to failed.',
      },
      tasks: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'List of task descriptions. Required for "create_plan" or "add_task".',
      },
      task_index: {
        type: Type.INTEGER,
        description: 'Index of the task to update (0-based). Required for status updates.',
      },
      failure_reason: {
        type: Type.STRING,
        description: 'If marking as failed, provide a short reason.',
      }
    },
    required: ['action'],
  }
};

const BASE_SYSTEM_INSTRUCTION = `
You are an expert ERP Print Form Developer acting as an AI Copilot.
Your goal is to edit HTML/CSS for business print forms (Invoices, Packing Slips).

### STYLING RULES (INLINE STYLES PREFERRED)
1. **NO <STYLE> BLOCKS**: You MUST use **INLINE STYLES** (style="...") for all elements.
   - Do not create CSS classes in a <head> or <style> tag unless absolutely necessary (e.g. for @media print).
   - This ensures compatibility with email clients and legacy ERP rendering engines.
2. **PAGE DIMENSIONS**: 
   - The form is designed for a specific page size provided in the configuration (Default: 750px width).
   - Ensure the main container matches the configured width.

### CRITICAL LAYOUT RULES (STRICT ERP COMPATIBILITY)
1. **TABLE STRUCTURE**: You MUST use the following specific structure for ALL tables.
   \`<table cellpadding="0" cellspacing="0" border="0" style="width:100%; table-layout:fixed;">\`
   
   - **cellpadding="0" cellspacing="0" border="0"**: Required legacy attributes.
   - **style="width:100%; table-layout:fixed;"**: REQUIRED.

2. **COLGROUP IS MANDATORY**:
   - **NEVER** set \`width\` on \`<td>\` tags. 
   - You **MUST** use \`<colgroup>\` to define column widths.
   - This ensures strict alignment across rows, which is critical for ERP forms.

3. **CELL STRUCTURE**:
   - Every \`<td>\` MUST include \`box-sizing: border-box;\` in its style. 

4. **NO DIVS FOR LAYOUT**: **DO NOT** use \`<div>\` tags for structure (columns/rows). The ONLY allowed \`<div>\` is the main wrapper \`<div class="printform" style="...">...</div>\`.

### WORKFLOW: TASK PLANNING & EXECUTION
1. **Check the Plan**: Always look at the [CURRENT PLAN] provided in the context.
2. **Execute Next**: If there are tasks in 'pending' status, execute the first one immediately.
3. **Update Status**: Use \`manage_plan\` to mark tasks as 'in_progress' or 'completed' as you go.
4. **Iterate**: Do not stop until all tasks in the plan are 'completed'.

### ERROR HANDLING & RETRY PROTOCOL
- If a tool returns an error (e.g., "Could not find exact snippet"):
  1. **DO NOT GIVE UP**.
  2. Analyze the error message.
  3. **RETRY** immediately with corrected arguments (e.g., adjust the search snippet, handle whitespace, or switch to \`rewrite\` if necessary).
  4. If you fail 3 times on the same task, use \`manage_plan\` to \`mark_failed\` with the reason.
`;

const VISION_INSTRUCTION = `
### IMAGE REPLICATION PROTOCOL (VISION MODE)
If the user attaches an image, you must act as a **Pixel-Perfect HTML Converter**.
1. **Analyze Grid**: Mentally map the image to a grid.
2. **Define Colgroup**: Calculate strict percentages for \`<col>\` tags based on the image.
3. **Replicate Structure**: Use the **STRICT TABLE STRUCTURE** defined above.
4. **Match Styling**: Match fonts (Serif/Sans), borders, and padding exactly using **INLINE STYLES**.
`;

export class GeminiService {
  private chat: Chat | null = null;
  private apiKey: string;
  private modelName: string;
  private activeTools: string[];
  private pageWidth: string;
  private pageHeight: string;

  constructor(
      apiKey: string, 
      modelName: string = 'gemini-3-pro-preview', 
      activeTools: string[] = [],
      pageWidth: string = '750px',
      pageHeight: string = '1050px'
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

  private initializeChat() {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    
    // Dynamic Tool Construction
    const functionDeclarations: FunctionDeclaration[] = [managePlanTool]; // Plan tool is always active
    const toolConfig: Tool[] = [];
    
    let systemInstruction = BASE_SYSTEM_INSTRUCTION;
    
    // Inject Dimensions into System Instruction
    systemInstruction += `\n\n### CONFIGURATION\n- Target Page Width: ${this.pageWidth}\n- Target Page Height: ${this.pageHeight}\n- Ensure the root container <div class="printform"> has style="width:${this.pageWidth}; min-height:${this.pageHeight};"`;

    // 1. Core Editing Tools
    if (this.activeTools.includes('code_replace') || this.activeTools.includes('code_rewrite')) {
        functionDeclarations.push(modifyCodeTool);
    }
    
    if (this.activeTools.includes('code_insert')) {
        functionDeclarations.push(insertContentTool);
    }

    // Add function declarations to tool config if any exist
    if (functionDeclarations.length > 0) {
        toolConfig.push({ functionDeclarations });
    }

    // 2. Web Search Tool
    if (this.activeTools.includes('web_search')) {
        toolConfig.push({ googleSearch: {} });
    }

    // 3. Vision / Image Analysis Capability
    if (this.activeTools.includes('image_analysis')) {
        systemInstruction += `\n\n${VISION_INSTRUCTION}`;
    }

    // 4. System Instruction Modifiers (Persona Tweaks)
    if (this.activeTools.includes('explain_code')) {
        systemInstruction += `\n\n### EXPLANATION MODE\n- You are in Verbose Mode. After every code change, explain clearly WHY you made the change and how it affects the print layout.`;
    }

    this.chat = ai.chats.create({
      model: this.modelName,
      config: {
        systemInstruction: systemInstruction,
        tools: toolConfig,
        temperature: 0.2, // Low temp for code precision
      },
    });
  }

  async sendMessageStream(message: string | Part[], currentFileContext: string, image?: { mimeType: string; data: string }, currentTasks: AgentTask[] = []): Promise<any> {
    if (!this.chat) {
        if (!this.apiKey) {
            throw new Error("API Key is missing. Please set it in Settings.");
        }
        this.initializeChat();
    }

    try {
      let messageParts: any[] = [];

      // Construct a text representation of the plan
      let planContext = "";
      if (currentTasks.length > 0) {
          planContext = "\n[CURRENT PLAN STATUS]:\n";
          currentTasks.forEach((t, i) => {
              planContext += `${i}. [${t.status.toUpperCase()}] ${t.description}\n`;
          });
          planContext += "\nInstruction: If there are PENDING tasks, proceed to the next one immediately.\n";
      }

      // Check if message is a simple string (New User Request) or a Part array (Function Response)
      if (typeof message === 'string') {
        // --- USER REQUEST ---
        // Prepend context hidden from the main chat flow logic
        const promptWithContext = `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]
${planContext}

User Request: ${message}
`;
        
        // If image exists, prioritize visual replication instructions
        if (image) {
            let visualPrompt = promptWithContext;
            // If the user sent an image with no text, we assume they want replication.
            if (!message.trim()) {
              visualPrompt = `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]

User Request: Analyze this image and reproduce this exact form layout using STRICT HTML Tables with <colgroup> logic. Use INLINE STYLES.
              `;
            } else {
               visualPrompt = `
[CURRENT FILE CONTEXT START]
${currentFileContext}
[CURRENT FILE CONTEXT END]

User Request: ${message}
(Note: Use the attached image as the primary visual reference for this request).
               `;
            }
  
            messageParts.push({
              inlineData: {
                  mimeType: image.mimeType,
                  data: image.data
              }
            });
            messageParts.push({ text: visualPrompt });
        } else {
            messageParts.push({ text: promptWithContext });
        }
      } else {
        // --- FUNCTION RESPONSE (INTERNAL LOOP) ---
        // Pass the parts directly. 
        // CRITICAL: We DO inject plan context here if possible, but sendMessageStream usually takes Part[] for function replies.
        // Google GenAI usually expects just the function response part. 
        // However, we can append a text part to reinforce the plan status if needed, 
        // but strictly adhering to the API, we usually send the ToolResponse.
        // To nudge the model, we can rely on the system instruction or the fact the model "remembers" the plan from previous turns?
        // Actually, it's better to NOT modify the ToolResponse structure, but we rely on the recursion loop in useAgentChat to start a NEW turn if needed,
        // or we trust the model.
        // HOWEVER, for robustness, if we are sending a tool response, the model will generate the NEXT message.
        // If we want to remind it of the plan, we might need to send a user message *after* the tool response, 
        // but here we are providing the *response to the tool call*.
        messageParts = message; 
      }

      // We use the non-null assertion because we check initialization above
      return await this.chat!.sendMessageStream({ message: messageParts });
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}
