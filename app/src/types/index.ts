export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  language?: string;
  isOpen?: boolean;
  isModified?: boolean;
  children?: FileNode[];
  parent?: string;
}

export interface EditorTab {
  id: string;
  name: string;
  path: string;
  content: string;
  language: string;
  modified: boolean;
  cursor?: { line: number; column: number };
  scroll?: { top: number };
}

export interface TerminalSession {
  id: string;
  name: string;
  history: TerminalLine[];
  currentPath: string;
  claudeMode: boolean;
}

export interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'claude-input' | 'claude-output' | 'tool-call';
  content: string;
  timestamp: number;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

export interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  input?: Record<string, string>;
  output?: string;
}

export interface Extension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  enabled: boolean;
  installed: boolean;
  downloads?: number;
  rating?: number;
}

export interface GitChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  staged: boolean;
}

export interface SearchResult {
  file: string;
  matches: Array<{
    line: number;
    text: string;
    range: [number, number];
  }>;
}

export type SidebarView = 'explorer' | 'search' | 'scm' | 'debug' | 'extensions';

export type MenuItem = {
  label?: string;
  shortcut?: string;
  action?: (() => void) | string;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
};

export interface Settings {
  theme: 'dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
}
