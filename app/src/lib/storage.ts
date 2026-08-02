import localforage from 'localforage';

const FILES_KEY = 'vscode-files';
const SETTINGS_KEY = 'vscode-settings';
const EXTENSIONS_KEY = 'vscode-extensions';
const TERMINAL_HISTORY_KEY = 'vscode-terminal-history';
const CLAUDE_HISTORY_KEY = 'vscode-claude-history';
const EDITOR_STATE_KEY = 'vscode-editor-state';
const RECENT_FOLDERS_KEY = 'vscode-recent-folders';
const OPEN_TABS_KEY = 'vscode-open-tabs';

export interface StoredFile {
  path: string;
  content: string;
  type: 'file' | 'folder';
  modified: number;
}

export interface EditorStateEntry {
  path: string;
  cursor: { line: number; column: number };
  scroll: { top: number };
}

localforage.config({
  name: 'vscode-web',
  storeName: 'app-data',
  version: 1.0,
});

const storage = {
  async getFiles(): Promise<Record<string, StoredFile>> {
    return (await localforage.getItem(FILES_KEY)) || {};
  },

  async setFiles(files: Record<string, StoredFile>): Promise<void> {
    await localforage.setItem(FILES_KEY, files);
  },

  async getSettings(): Promise<Record<string, unknown> | null> {
    return localforage.getItem(SETTINGS_KEY);
  },

  async setSettings(settings: Record<string, unknown>): Promise<void> {
    await localforage.setItem(SETTINGS_KEY, settings);
  },

  async getExtensions(): Promise<unknown[] | null> {
    return localforage.getItem(EXTENSIONS_KEY);
  },

  async setExtensions(extensions: unknown[]): Promise<void> {
    await localforage.setItem(EXTENSIONS_KEY, extensions);
  },

  async getTerminalHistory(): Promise<string[]> {
    return (await localforage.getItem(TERMINAL_HISTORY_KEY)) || [];
  },

  async setTerminalHistory(history: string[]): Promise<void> {
    await localforage.setItem(TERMINAL_HISTORY_KEY, history);
  },

  async getClaudeHistory(): Promise<unknown[] | null> {
    return localforage.getItem(CLAUDE_HISTORY_KEY);
  },

  async setClaudeHistory(history: unknown[]): Promise<void> {
    await localforage.setItem(CLAUDE_HISTORY_KEY, history);
  },

  async getEditorState(): Promise<EditorStateEntry[] | null> {
    return localforage.getItem(EDITOR_STATE_KEY);
  },

  async setEditorState(state: EditorStateEntry[]): Promise<void> {
    await localforage.setItem(EDITOR_STATE_KEY, state);
  },

  async getRecentFolders(): Promise<string[]> {
    return (await localforage.getItem(RECENT_FOLDERS_KEY)) || [];
  },

  async setRecentFolders(folders: string[]): Promise<void> {
    await localforage.setItem(RECENT_FOLDERS_KEY, folders);
  },

  async getOpenTabs(): Promise<{ tabs: string[]; active: string } | null> {
    return localforage.getItem(OPEN_TABS_KEY);
  },

  async setOpenTabs(tabs: string[], active: string): Promise<void> {
    await localforage.setItem(OPEN_TABS_KEY, { tabs, active });
  },

  async resetAll(): Promise<void> {
    await localforage.clear();
  },
};

export default storage;
