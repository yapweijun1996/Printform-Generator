export enum Sender {
  User = 'user',
  Bot = 'bot',
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: number;
  isStreaming?: boolean;
  statusText?: string; // e.g. "Writing code...", "Planning..."
  attachment?: {
    mimeType: string;
    data: string; // Base64 string
  };
  toolCall?: {
    name: string;
    args: any;
    status: 'pending' | 'success' | 'error';
  };
  action?: {
    type: 'continue_execution';
    label: string;
    onAction: () => void;
  };
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
    onAction: () => void;
  }>;
  collapsible?: {
    title: string;
    content: string;
    defaultOpen?: boolean;
  };
}

export interface ProjectFile {
  id: string;
  name: string;
  language: 'html';
  content: string;
  updatedAt: number;
}

export interface FileHistory {
  id: string;
  timestamp: number;
  description: string; // "Added tax column" or "Manual Edit"
  content: string;
}

export interface AgentTask {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'retrying';
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: string; // e.g., "modify_code", "manage_plan", "insert_content"
  description: string; // Human-readable description
  status: 'success' | 'error';
  details?: string; // Optional detailed output
  args?: any; // Tool arguments for debugging
}

export interface ChatSessionState {
  messages: Message[];
  isLoading: boolean;
}

export interface UserSettings {
  apiKey: string;
  model: string;
  activeTools: string[];
  pageWidth: string;
  pageHeight: string;
  minRowItemsForPaginationTest: number;
  autoApplyDiff: boolean;
  strictPreviewGate: boolean;
  semanticRagEnabled: boolean;
  semanticRagTopK: number;
}

export type ViewMode = 'preview' | 'code' | 'split';
export type SidebarTab = 'chat' | 'files' | 'plan' | 'history' | 'audit';
