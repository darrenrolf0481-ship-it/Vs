import { create } from 'zustand';
import type { FileNode, EditorTab, TerminalSession, TerminalLine, Extension, GitChange, SidebarView, Settings } from '@/types';
import { DEFAULT_WORKSPACE, getLanguageFromExt, generateId, addChildNode, removeNode, updateNode } from '@/lib/filesystem';
import storage from '@/lib/storage';
import { api, ApiError, type ApiFileNode } from '@/lib/api';

interface AppState {
  // UI State
  sidebarVisible: boolean;
  sidebarView: SidebarView;
  sidebarWidth: number;
  panelVisible: boolean;
  panelHeight: number;
  panelMaximized: boolean;
  panelTab: 'terminal' | 'problems' | 'output' | 'debug-console';
  theme: 'dark' | 'light';

  // Editor State
  editorTabs: EditorTab[];
  activeTabId: string | null;

  // File State
  fileTree: FileNode[];

  // Backend connection state
  backendConnected: boolean;
  backendError: string | null;
  workspacePath: string | null;
  fsLoading: boolean;

  // Terminal State
  terminalSessions: TerminalSession[];
  activeTerminalId: string;
  commandHistory: string[];
  claudeMode: boolean;

  // Git State
  gitChanges: GitChange[];
  gitBranch: string;

  // Extensions
  extensions: Extension[];

  // Settings
  settings: Settings;

  // Actions
  toggleSidebar: () => void;
  setSidebarView: (view: SidebarView) => void;
  setSidebarWidth: (width: number) => void;
  togglePanel: () => void;
  setPanelHeight: (height: number) => void;
  togglePanelMaximize: () => void;
  syncMaximizedPanelHeight: () => void;
  setPanelTab: (tab: 'terminal' | 'problems' | 'output' | 'debug-console') => void;

  // Editor Actions
  openFile: (node: FileNode) => void;
  closeTab: (tabId: string) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTabContent: (tabId: string, content: string) => void;
  saveTab: (tabId: string) => void;
  markTabModified: (tabId: string, modified: boolean) => void;

  // File Actions
  createFile: (parentId: string, name: string) => void;
  createFolder: (parentId: string, name: string) => void;
  deleteNode: (nodeId: string) => void;
  renameNode: (nodeId: string, newName: string) => void;
  toggleFolder: (nodeId: string) => void;
  updateFileContent: (nodeId: string, content: string) => void;

  // Terminal Actions
  createTerminalSession: () => void;
  switchTerminal: (id: string) => void;
  closeTerminal: (id: string) => void;
  addTerminalLine: (sessionId: string, line: TerminalLine) => void;
  setTerminalPath: (sessionId: string, path: string) => void;
  toggleClaudeMode: (sessionId: string) => void;
  addToCommandHistory: (command: string) => void;

  // Git Actions
  stageFile: (path: string) => void;
  unstageFile: (path: string) => void;
  setGitBranch: (branch: string) => void;

  // Extension Actions
  toggleExtension: (id: string) => void;
  installExtension: (ext: Extension) => void;
  uninstallExtension: (id: string) => void;

  // Settings Actions
  updateSettings: (settings: Partial<Settings>) => void;

  // Persistence
  persistState: () => void;
  loadState: () => Promise<void>;

  // Real filesystem (backend-backed)
  connectBackend: () => Promise<void>;
  refreshTree: () => Promise<void>;
  openFileFromDisk: (path: string) => Promise<void>;
  saveTabToDisk: (tabId: string) => Promise<void>;
  createOnDisk: (parentPath: string, name: string, type: 'file' | 'folder') => Promise<void>;
  deleteOnDisk: (path: string) => Promise<void>;
  renameOnDisk: (fromPath: string, newName: string) => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  minimap: true,
  lineNumbers: true,
  autoSave: false,
};

const DEFAULT_EXTENSIONS: Extension[] = [
  { id: 'es7-react', name: 'ES7+ React/Redux/React-Native snippets', publisher: 'dsznajder', version: '4.4.3', description: 'Extensions for React, React-Native and Redux in JS/TS with ES7+ syntax', enabled: true, installed: true },
  { id: 'prettier', name: 'Prettier - Code: formatter', publisher: 'Prettier', version: '3.2.5', description: 'Code: formatter using prettier', enabled: true, installed: true },
  { id: 'eslint', name: 'ESLint', publisher: 'Microsoft', version: '2.4.4', description: 'Integrates ESLint JavaScript', enabled: true, installed: true },
  { id: 'gitlens', name: 'GitLens', publisher: 'GitKraken', version: '14.4.1', description: 'Supercharge Git within VS Code:', enabled: true, installed: true },
  { id: 'docker', name: 'Docker', publisher: 'Microsoft', version: '1.29.0', description: 'Makes it easy to create, manage, and debug containerized applications', enabled: false, installed: true },
  { id: 'python', name: 'Python', publisher: 'Microsoft', version: '2024.2.1', description: 'Python language support', enabled: true, installed: true },
  { id: 'rust-analyzer', name: 'rust-analyzer', publisher: 'The Rust Programming Language', version: '0.3.1860', description: 'Rust language support for VS Code:', enabled: false, installed: true },
  { id: 'go', name: 'Go', publisher: 'Google', version: '0.41.0', description: 'Rich Go language support', enabled: false, installed: true },
];

let persistTimeout: ReturnType<typeof setTimeout>;
let panelHeightBeforeMaximize = 200;

const INITIAL_TERMINAL_SESSION: TerminalSession = {
  id: generateId(),
  name: 'bash',
  history: [],
  currentPath: '/workspace',
  claudeMode: false,
};

export const useAppStore = create<AppState>((set, get) => ({
  // UI State
  sidebarVisible: true,
  sidebarView: 'explorer',
  sidebarWidth: 250,
  panelVisible: true,
  panelHeight: 200,
  panelMaximized: false,
  panelTab: 'terminal',
  theme: 'dark',

  // Editor State
  editorTabs: [],
  activeTabId: null,

  // File State
  fileTree: DEFAULT_WORKSPACE,

  // Backend connection state
  backendConnected: false,
  backendError: null,
  workspacePath: null,
  fsLoading: false,

  // Terminal State
  terminalSessions: [INITIAL_TERMINAL_SESSION],
  // Must match the initial session's id, otherwise no terminal renders on load
  activeTerminalId: INITIAL_TERMINAL_SESSION.id,
  commandHistory: [],
  claudeMode: false,

  // Git State
  gitChanges: [
    { path: 'src/index.ts', status: 'modified', staged: false },
    { path: 'README.md', status: 'modified', staged: true },
    { path: 'package.json', status: 'untracked', staged: false },
  ],
  gitBranch: 'main',

  // Extensions
  extensions: DEFAULT_EXTENSIONS,

  // Settings
  settings: DEFAULT_SETTINGS,

  // UI Actions
  toggleSidebar: () => {
    set((state) => ({ sidebarVisible: !state.sidebarVisible }));
    get().persistState();
  },

  setSidebarView: (view) => {
    set({ sidebarView: view });
    if (!get().sidebarVisible) {
      set({ sidebarVisible: true });
    }
  },

  setSidebarWidth: (width) => {
    set({ sidebarWidth: Math.max(150, Math.min(500, width)) });
  },

  togglePanel: () => {
    set((state) => ({ panelVisible: !state.panelVisible }));
    get().persistState();
  },

  setPanelHeight: (height) => {
    // Manually dragging the handle always exits the maximized state
    set({ panelHeight: Math.max(100, Math.min(window.innerHeight - 120, height)), panelMaximized: false });
  },

  togglePanelMaximize: () => {
    const state = get();
    if (state.panelMaximized) {
      set({ panelHeight: panelHeightBeforeMaximize, panelMaximized: false });
    } else {
      panelHeightBeforeMaximize = state.panelHeight;
      // Leave room for the title bar (~30px), tab bar (~35px), and status bar (~22px)
      set({ panelHeight: Math.max(200, window.innerHeight - 140), panelMaximized: true });
    }
  },

  setPanelTab: (tab) => set({ panelTab: tab }),

  // Called on window resize/orientation change to keep a maximized panel
  // filling the viewport correctly without exiting the maximized state.
  syncMaximizedPanelHeight: () => {
    if (get().panelMaximized) {
      set({ panelHeight: Math.max(200, window.innerHeight - 140) });
    }
  },

  // Editor Actions
  openFile: (node) => {
    const state = get();

    // With the backend live, node.id is the real workspace-relative path.
    if (state.backendConnected && node.type === 'file') {
      void get().openFileFromDisk(node.id);
      return;
    }

    const existingTab = state.editorTabs.find((t) => t.path === node.name);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }
    const newTab: EditorTab = {
      id: generateId(),
      name: node.name,
      path: node.name,
      content: node.content || '',
      language: node.language || getLanguageFromExt(node.name),
      modified: false,
    };
    set({
      editorTabs: [...state.editorTabs, newTab],
      activeTabId: newTab.id,
    });
    get().persistState();
  },

  closeTab: (tabId) => {
    const state = get();
    const newTabs = state.editorTabs.filter((t) => t.id !== tabId);
    let newActiveId = state.activeTabId;
    if (state.activeTabId === tabId) {
      const closedIndex = state.editorTabs.findIndex((t) => t.id === tabId);
      newActiveId = newTabs[Math.min(closedIndex, newTabs.length - 1)]?.id || null;
    }
    set({ editorTabs: newTabs, activeTabId: newActiveId });
    get().persistState();
  },

  closeAllTabs: () => {
    set({ editorTabs: [], activeTabId: null });
    get().persistState();
  },

  closeOtherTabs: (tabId) => {
    const state = get();
    const keepTab = state.editorTabs.find((t) => t.id === tabId);
    if (keepTab) {
      set({ editorTabs: [keepTab], activeTabId: tabId });
      get().persistState();
    }
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  updateTabContent: (tabId, content) => {
    set((state) => ({
      editorTabs: state.editorTabs.map((t) =>
        t.id === tabId ? { ...t, content, modified: true } : t
      ),
    }));
  },

  saveTab: (tabId) => {
    const state = get();

    if (state.backendConnected) {
      void get().saveTabToDisk(tabId);
      return;
    }

    const tab = state.editorTabs.find((t) => t.id === tabId);
    if (!tab) return;
    set((s) => ({
      editorTabs: s.editorTabs.map((t) =>
        t.id === tabId ? { ...t, modified: false } : t
      ),
    }));
    // Also update file tree
    const updateFileInTree = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((n) => {
        if (n.name === tab.name && n.type === 'file') {
          return { ...n, content: tab.content };
        }
        if (n.children) {
          return { ...n, children: updateFileInTree(n.children) };
        }
        return n;
      });
    };
    set({ fileTree: updateFileInTree(state.fileTree) });
    get().persistState();
  },

  markTabModified: (tabId, modified) => {
    set((state) => ({
      editorTabs: state.editorTabs.map((t) =>
        t.id === tabId ? { ...t, modified } : t
      ),
    }));
  },

  // File Actions
  createFile: (parentId, name) => {
    if (get().backendConnected) {
      // parentId is the real path of the containing folder
      void get().createOnDisk(parentId === 'root-src' ? '.' : parentId, name, 'file');
      return;
    }
    const newFile: FileNode = {
      id: generateId(),
      name,
      type: 'file',
      content: '',
      language: getLanguageFromExt(name),
      parent: parentId,
    };
    set((state) => ({ fileTree: addChildNode(state.fileTree, parentId, newFile) }));
    get().persistState();
  },

  createFolder: (parentId, name) => {
    if (get().backendConnected) {
      void get().createOnDisk(parentId === 'root-src' ? '.' : parentId, name, 'folder');
      return;
    }
    const newFolder: FileNode = {
      id: generateId(),
      name,
      type: 'folder',
      isOpen: true,
      parent: parentId,
      children: [],
    };
    set((state) => ({ fileTree: addChildNode(state.fileTree, parentId, newFolder) }));
    get().persistState();
  },

  deleteNode: (nodeId) => {
    if (get().backendConnected) {
      void get().deleteOnDisk(nodeId);
      return;
    }
    set((state) => ({ fileTree: removeNode(state.fileTree, nodeId) }));
    // Also close tab if open
    const state = get();
    const tabToClose = state.editorTabs.find((t) => {
      const node = findNodeById(state.fileTree, nodeId);
      return node && t.name === node.name;
    });
    if (tabToClose) {
      get().closeTab(tabToClose.id);
    }
    get().persistState();
  },

  renameNode: (nodeId, newName) => {
    if (get().backendConnected) {
      void get().renameOnDisk(nodeId, newName);
      return;
    }
    set((state) => ({
      fileTree: updateNode(state.fileTree, nodeId, { name: newName }),
    }));
    get().persistState();
  },

  toggleFolder: (nodeId) => {
    const state = get();
    const node = findNodeById(state.fileTree, nodeId);
    if (node) {
      set((s) => ({
        fileTree: updateNode(s.fileTree, nodeId, { isOpen: !node.isOpen }),
      }));
    }
  },

  updateFileContent: (nodeId, content) => {
    set((state) => ({
      fileTree: updateNode(state.fileTree, nodeId, { content }),
    }));
    get().persistState();
  },

  // Terminal Actions
  createTerminalSession: () => {
    const newSession: TerminalSession = {
      id: generateId(),
      name: `bash ${get().terminalSessions.length + 1}`,
      history: [{
        type: 'output',
        content: 'Welcome to VS Code: Web Terminal. Type \'help\' for available commands.\nType \'claude\' to enter Claude Code REPL.',
        timestamp: Date.now(),
      }],
      currentPath: '/workspace',
      claudeMode: false,
    };
    set((state) => ({
      terminalSessions: [...state.terminalSessions, newSession],
      activeTerminalId: newSession.id,
    }));
  },

  switchTerminal: (id) => set({ activeTerminalId: id }),

  closeTerminal: (id) => {
    set((state) => {
      const newSessions = state.terminalSessions.filter((s) => s.id !== id);
      return {
        terminalSessions: newSessions,
        activeTerminalId: newSessions.length > 0 ? newSessions[newSessions.length - 1].id : '',
      };
    });
  },

  addTerminalLine: (sessionId, line) => {
    set((state) => ({
      terminalSessions: state.terminalSessions.map((s) =>
        s.id === sessionId ? { ...s, history: [...s.history, line] } : s
      ),
    }));
  },

  setTerminalPath: (sessionId, path) => {
    set((state) => ({
      terminalSessions: state.terminalSessions.map((s) =>
        s.id === sessionId ? { ...s, currentPath: path } : s
      ),
    }));
  },

  toggleClaudeMode: (sessionId) => {
    set((state) => ({
      terminalSessions: state.terminalSessions.map((s) =>
        s.id === sessionId ? { ...s, claudeMode: !s.claudeMode } : s
      ),
      claudeMode: !state.terminalSessions.find((s) => s.id === sessionId)?.claudeMode,
    }));
  },

  addToCommandHistory: (command) => {
    set((state) => ({
      commandHistory: [...state.commandHistory.slice(-999), command],
    }));
    storage.setTerminalHistory(get().commandHistory);
  },

  // Git Actions
  stageFile: (path) => {
    set((state) => ({
      gitChanges: state.gitChanges.map((c) =>
        c.path === path ? { ...c, staged: true } : c
      ),
    }));
  },

  unstageFile: (path) => {
    set((state) => ({
      gitChanges: state.gitChanges.map((c) =>
        c.path === path ? { ...c, staged: false } : c
      ),
    }));
  },

  setGitBranch: (branch) => set({ gitBranch: branch }),

  // Extension Actions
  toggleExtension: (id) => {
    set((state) => ({
      extensions: state.extensions.map((e) =>
        e.id === id ? { ...e, enabled: !e.enabled } : e
      ),
    }));
  },

  installExtension: (ext) => {
    set((state) => ({
      extensions: [...state.extensions, { ...ext, installed: true, enabled: true }],
    }));
  },

  uninstallExtension: (id) => {
    set((state) => ({
      extensions: state.extensions.filter((e) => e.id !== id),
    }));
  },

  // Settings Actions
  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().persistState();
  },

  // Persistence
  persistState: () => {
    clearTimeout(persistTimeout);
    persistTimeout = setTimeout(async () => {
      const state = get();
      await storage.setOpenTabs(
        state.editorTabs.map((t) => t.path),
        state.activeTabId || ''
      );
    }, 500);
  },

  loadState: async () => {
    const settings = await storage.getSettings();
    const extensions = await storage.getExtensions();
    const commandHistory = await storage.getTerminalHistory();

    if (settings) {
      set((s) => ({ settings: { ...s.settings, ...settings } as Settings }));
    }
    if (extensions) {
      set({ extensions: extensions as Extension[] });
    }
    if (commandHistory.length > 0) {
      set({ commandHistory });
    }
  },

  // ---------------------------------------------------------------------
  // Real filesystem, backed by the local server.
  //
  // When the backend is reachable the file tree reflects actual files on
  // disk and edits are written through to them. When it isn't, the app
  // falls back to the in-memory demo workspace so the UI still functions
  // rather than presenting an empty, broken explorer.
  // ---------------------------------------------------------------------

  connectBackend: async () => {
    set({ fsLoading: true });
    try {
      const health = await api.health();
      set({
        backendConnected: true,
        backendError: null,
        workspacePath: health.workspace,
      });
      await get().refreshTree();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not reach the backend server.';
      set({
        backendConnected: false,
        backendError: message,
        fileTree: DEFAULT_WORKSPACE,
      });
    } finally {
      set({ fsLoading: false });
    }
  },

  refreshTree: async () => {
    if (!get().backendConnected) return;
    try {
      const { children } = await api.tree('.', 6);
      set({ fileTree: children.map(toFileNode) });
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to load file tree',
      });
    }
  },

  openFileFromDisk: async (path) => {
    const state = get();
    const existing = state.editorTabs.find((t) => t.path === path);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const { content } = await api.read(path);
      const name = path.split('/').pop() || path;
      const newTab: EditorTab = {
        id: generateId(),
        name,
        path,
        content,
        language: getLanguageFromExt(name),
        modified: false,
      };
      set((s) => ({
        editorTabs: [...s.editorTabs, newTab],
        activeTabId: newTab.id,
        backendError: null,
      }));
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to open file',
      });
    }
  },

  saveTabToDisk: async (tabId) => {
    const tab = get().editorTabs.find((t) => t.id === tabId);
    if (!tab) return;

    try {
      await api.write(tab.path, tab.content);
      set((s) => ({
        editorTabs: s.editorTabs.map((t) =>
          t.id === tabId ? { ...t, modified: false } : t
        ),
        backendError: null,
      }));
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to save file',
      });
    }
  },

  createOnDisk: async (parentPath, name, type) => {
    // parentPath '.' means the workspace root
    const target = parentPath === '.' || parentPath === '' ? name : `${parentPath}/${name}`;
    try {
      await api.create(target, type);
      await get().refreshTree();
      set({ backendError: null });
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to create',
      });
    }
  },

  deleteOnDisk: async (path) => {
    try {
      await api.remove(path);
      // Close any open tab pointing at the deleted file
      const openTab = get().editorTabs.find((t) => t.path === path);
      if (openTab) get().closeTab(openTab.id);
      await get().refreshTree();
      set({ backendError: null });
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to delete',
      });
    }
  },

  renameOnDisk: async (fromPath, newName) => {
    const parts = fromPath.split('/');
    parts[parts.length - 1] = newName;
    const toPath = parts.join('/');

    try {
      await api.rename(fromPath, toPath);
      // Keep any open tab pointing at the renamed file in sync
      set((s) => ({
        editorTabs: s.editorTabs.map((t) =>
          t.path === fromPath ? { ...t, path: toPath, name: newName } : t
        ),
      }));
      await get().refreshTree();
      set({ backendError: null });
    } catch (err) {
      set({
        backendError: err instanceof ApiError ? err.message : 'Failed to rename',
      });
    }
  },
}));

/** Convert a backend tree node into the shape the existing UI expects. */
function toFileNode(node: ApiFileNode): FileNode {
  return {
    id: node.path,
    name: node.name,
    type: node.type,
    isOpen: false,
    children: node.children?.map(toFileNode),
    language: node.type === 'file' ? getLanguageFromExt(node.name) : undefined,
  };
}

function findNodeById(nodes: FileNode[], id: string): FileNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
