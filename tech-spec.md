# VS Code Web — Tech Spec

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^18.3.0 | UI framework |
| react-dom | ^18.3.0 | React DOM renderer |
| @monaco-editor/react | ^4.6.0 | Monaco Editor React wrapper |
| monaco-editor | ^0.47.0 | Core Monaco editor (peer dep) |
| zustand | ^4.5.0 | State management |
| localforage | ^1.10.0 | IndexedDB wrapper |
| lucide-react | ^0.400.0 | Icon library |
| tailwindcss | ^3.4.0 | Utility CSS |
| @types/react | ^18.3.0 | TypeScript types |
| @types/react-dom | ^18.3.0 | TypeScript types |
| typescript | ^5.4.0 | TypeScript compiler |
| vite | ^5.0.0 | Build tool |
| @vitejs/plugin-react | ^4.3.0 | Vite React plugin |

## Component Inventory

### Layout (all custom)
| Component | Source | Notes |
|-----------|--------|-------|
| TitleBar | Custom | 30px, menu bar + window controls |
| ActivityBar | Custom | 48px, 5 icon buttons |
| Sidebar | Custom | 250px resizable, view switcher |
| EditorArea | Custom | Tab bar + breadcrumb + Monaco |
| Panel | Custom | 200px resizable, terminal tabs |
| StatusBar | Custom | 22px, info + indicators |
| ResizablePanel | Custom | HOC for sidebar/panel resize |

### Sidebar Views (all custom)
| Component | Notes |
|-----------|-------|
| ExplorerView | File tree with CRUD, context menu |
| SearchView | Search input + results grouped by file |
| SCMView | Git changes with staging |
| DebugView | Debug controls + panels |
| ExtensionsView | Extension list + marketplace |

### Editor (Monaco)
| Component | Source | Notes |
|-----------|--------|-------|
| MonacoEditor | @monaco-editor/react | Full Monaco instance |
| TabBar | Custom | Scrollable tabs with close buttons |
| Breadcrumb | Custom | Path segments |
| WelcomePage | Custom | Shown when no tabs open |

### Terminal (custom-built)
| Component | Notes |
|-----------|-------|
| TerminalPanel | Tabbed terminal container |
| TerminalSession | Individual terminal instance |
| TerminalInput | Input line with prompt |
| ClaudeREPL | Claude Code mode overlay |

### Shared Components
| Component | Notes |
|-----------|-------|
| ContextMenu | Right-click menus throughout |
| IconButton | Activity bar buttons |
| TreeItem | File tree items (recursive) |
| DropdownMenu | Top menu bar dropdowns |

## Animation Implementation

| Animation | Library | Implementation | Complexity |
|-----------|---------|----------------|------------|
| Tab open/close | CSS transition | 150ms opacity + transform | Low |
| Sidebar toggle | CSS transition | 200ms width with content fade | Low |
| Panel toggle | CSS transition | 200ms height slide | Low |
| Claude stream | Custom setInterval | Character-by-character, 15ms delay | Medium |
| Tool call expand | CSS transition | 200ms max-height + opacity | Low |
| Context menu | CSS transition | 100ms scale + opacity | Low |
| Activity bar indicator | CSS transition | 150ms transform slide | Low |
| Status bar item hover | CSS transition | 100ms background | Low |
| File tree expand | CSS transition | 150ms height + rotate chevron | Low |
| Terminal cursor blink | CSS keyframes | 530ms opacity toggle | Low |
| Dropdown open | CSS transition | 100ms translateY + opacity | Low |
| Resize handle hover | CSS transition | 100ms background opacity | Low |

## State & Logic Plan

### Global Store (Zustand)
Single store splitting into logical slices:

**UISlice**: sidebarVisible, sidebarView, sidebarWidth, panelVisible, panelHeight, theme
**EditorSlice**: tabs, activeTab, cursorPositions, scrollPositions
**FileSlice**: fileTree (tree in memory, synced to IndexedDB)
**TerminalSlice**: sessions, activeSession, history, claudeMode, claudeMessages
**GitSlice**: changes, staged, branch
**ExtensionSlice**: installed, marketplace

### Data Flow
1. **File operations** → update tree in Zustand → sync to IndexedDB (debounced 500ms)
2. **Editor changes** → Monaco onChange → update tab modified state → sync to IndexedDB
3. **Terminal commands** → parse → execute against virtual FS → render output
4. **Claude REPL** → capture input → stream simulated response → append to messages
5. **Git operations** → read file tree changes → calculate diffs → display in SCM

### Monaco Integration
- Load Monaco from the bundled `monaco-editor` package via `loader.config({ monaco })`
  (see `src/lib/monaco-setup.ts`) — not from a CDN, so the editor works offline
- Register 25+ language modes via monaco.languages
- Configure theme to match VS Code dark
- Enable: minimap, line numbers, folding, bracket matching, suggest, hover
- Bind Ctrl+Shift+P to Monaco's built-in command palette
- Bind Ctrl+F to Monaco's find widget

### Terminal Engine
- Virtual file system: in-memory tree mirrored to IndexedDB
- Command parser: simple split+route pattern
- 15 built-in commands with real file system effects
- Tab completion: prefix match against current directory entries
- History: circular buffer, persisted to IndexedDB
- Claude mode: state flag switches prompt, parser, and renderer

### Claude REPL Simulation
- Streaming: setInterval adding chars one-by-one, clear on interrupt
- Slash commands: /help, /clear, /exit, /model, /tools
- Tool calls: expandable blocks with spinner → checkmark animation
- Pre-written response templates for common queries
- Response selection based on keyword matching

### IndexedDB Sync
- localforage for simple key-value operations
- Files stored as flat map: `{ "path": { content, type, modified } }`
- On boot: load all files → reconstruct tree → populate store
- On change: debounced write back to IndexedDB

## Other Key Decisions

### Monaco Loading
Bundle Monaco rather than fetching it from a CDN. `@monaco-editor/react` defaults
to loading the editor from jsDelivr on first file open, which makes a local,
offline-first editor silently depend on the network — with no connection the tab
sits on "Loading..." indefinitely. `src/lib/monaco-setup.ts` passes the bundled
`monaco-editor` to `loader.config()` and wires the JSON/CSS/HTML/TS language
workers through Vite's `?worker` imports.

Cost: the main chunk grows from ~380 KB to ~4.2 MB (~1.1 MB gzipped). That is
paid over localhost, so it is not a meaningful load-time concern here, and it
buys full offline operation.

### Virtual File System
Flat storage in IndexedDB with path keys. Tree reconstructed on load. Supports: create, read, update, delete, rename, move, list directory.

### Terminal Implementation
Custom React component (not xterm.js) for tighter integration with Zustand and Claude REPL mode. Uses a contentEditable div or input with ref forwarding for focus management.

### No Service Worker
Single-page app without offline service worker. IndexedDB provides persistence within the browser.

### Default Workspace
On first load, create a sample workspace with:
- README.md
- src/index.ts
- src/app.ts
- package.json
- .gitignore

This gives the user something to interact with immediately.
