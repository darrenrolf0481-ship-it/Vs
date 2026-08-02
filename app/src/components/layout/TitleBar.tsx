import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store';
import type { MenuItem } from '@/types';
import { Minus, Square, X } from 'lucide-react';

const MENUS: { label: string; items: MenuItem[] }[] = [
  {
    label: 'File',
    items: [
      { label: 'New File...', shortcut: 'Ctrl+N', action: 'newFile' },
      { label: 'New Folder...', shortcut: 'Ctrl+Shift+N', action: 'newFolder' },
      { separator: true },
      { label: 'Open File...', shortcut: 'Ctrl+O', action: 'openFile' },
      { label: 'Open Folder...', action: 'openFolder' },
      { separator: true },
      { label: 'Save', shortcut: 'Ctrl+S', action: 'save' },
      { label: 'Save All', shortcut: 'Ctrl+K S', action: 'saveAll' },
      { separator: true },
      { label: 'Close Editor', shortcut: 'Ctrl+W', action: 'closeEditor' },
      { label: 'Close Folder', shortcut: 'Ctrl+K F', action: 'closeFolder' },
      { separator: true },
      { label: 'Exit', action: 'exit' },
    ],
  },
  {
    label: 'Edit',
    items: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: 'undo' },
      { label: 'Redo', shortcut: 'Ctrl+Y', action: 'redo' },
      { separator: true },
      { label: 'Cut', shortcut: 'Ctrl+X', action: 'cut' },
      { label: 'Copy', shortcut: 'Ctrl+C', action: 'copy' },
      { label: 'Paste', shortcut: 'Ctrl+V', action: 'paste' },
      { separator: true },
      { label: 'Find', shortcut: 'Ctrl+F', action: 'find' },
      { label: 'Replace', shortcut: 'Ctrl+H', action: 'replace' },
      { separator: true },
      { label: 'Find in Files', shortcut: 'Ctrl+Shift+F', action: 'findInFiles' },
      { separator: true },
      { label: 'Toggle Line Comment', shortcut: 'Ctrl+/', action: 'toggleComment' },
    ],
  },
  {
    label: 'Selection',
    items: [
      { label: 'Select All', shortcut: 'Ctrl+A', action: 'selectAll' },
      { label: 'Expand Selection', shortcut: 'Shift+Alt+Right', action: 'expandSelection' },
      { label: 'Shrink Selection', shortcut: 'Shift+Alt+Left', action: 'shrinkSelection' },
      { separator: true },
      { label: 'Copy Line Up', shortcut: 'Shift+Alt+Up', action: 'copyLineUp' },
      { label: 'Copy Line Down', shortcut: 'Shift+Alt+Down', action: 'copyLineDown' },
      { label: 'Move Line Up', shortcut: 'Alt+Up', action: 'moveLineUp' },
      { label: 'Move Line Down', shortcut: 'Alt+Down', action: 'moveLineDown' },
      { separator: true },
      { label: 'Add Cursor Above', shortcut: 'Ctrl+Alt+Up', action: 'addCursorAbove' },
      { label: 'Add Cursor Below', shortcut: 'Ctrl+Alt+Down', action: 'addCursorBelow' },
    ],
  },
  {
    label: 'View',
    items: [
      { label: 'Command Palette...', shortcut: 'Ctrl+Shift+P', action: 'commandPalette' },
      { label: 'Open View...', action: 'openView' },
      { separator: true },
      { label: 'Appearance', submenu: [
        { label: 'Full Screen', shortcut: 'F11', action: 'fullScreen' },
        { label: 'Zen Mode', shortcut: 'Ctrl+K Z', action: 'zenMode' },
      ]},
      { separator: true },
      { label: 'Explorer', shortcut: 'Ctrl+Shift+E', action: 'showExplorer' },
      { label: 'Search', shortcut: 'Ctrl+Shift+F', action: 'showSearch' },
      { label: 'Source Control', shortcut: 'Ctrl+Shift+G', action: 'showSCM' },
      { label: 'Run and Debug', shortcut: 'Ctrl+Shift+D', action: 'showDebug' },
      { label: 'Extensions', shortcut: 'Ctrl+Shift+X', action: 'showExtensions' },
      { separator: true },
      { label: 'Terminal', shortcut: 'Ctrl+`', action: 'toggleTerminal' },
      { label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: 'toggleSidebar' },
    ],
  },
  {
    label: 'Go',
    items: [
      { label: 'Back', shortcut: 'Alt+Left', action: 'goBack' },
      { label: 'Forward', shortcut: 'Alt+Right', action: 'goForward' },
      { separator: true },
      { label: 'Go to File...', shortcut: 'Ctrl+P', action: 'goToFile' },
      { label: 'Go to Symbol...', shortcut: 'Ctrl+Shift+O', action: 'goToSymbol' },
      { label: 'Go to Line...', shortcut: 'Ctrl+G', action: 'goToLine' },
      { separator: true },
      { label: 'Next Problem', shortcut: 'F8', action: 'nextProblem' },
      { label: 'Previous Problem', shortcut: 'Shift+F8', action: 'prevProblem' },
    ],
  },
  {
    label: 'Run',
    items: [
      { label: 'Start Debugging', shortcut: 'F5', action: 'startDebug' },
      { label: 'Run Without Debugging', shortcut: 'Ctrl+F5', action: 'runWithoutDebug' },
      { label: 'Stop Debugging', shortcut: 'Shift+F5', action: 'stopDebug' },
      { separator: true },
      { label: 'Toggle Breakpoint', shortcut: 'F9', action: 'toggleBreakpoint' },
      { separator: true },
      { label: 'Run Task...', action: 'runTask' },
    ],
  },
  {
    label: 'Terminal',
    items: [
      { label: 'New Terminal', shortcut: 'Ctrl+Shift+`', action: 'newTerminal' },
      { label: 'Split Terminal', action: 'splitTerminal' },
      { separator: true },
      { label: 'Run Build Task...', shortcut: 'Ctrl+Shift+B', action: 'runBuildTask' },
      { label: 'Run Active File', action: 'runActiveFile' },
      { separator: true },
      { label: 'Claude Code', action: 'claudeCode' },
    ],
  },
  {
    label: 'Help',
    items: [
      { label: 'Welcome', action: 'welcome' },
      { label: 'Show All Commands', shortcut: 'Ctrl+Shift+P', action: 'commandPalette' },
      { label: 'Keyboard Shortcuts', shortcut: 'Ctrl+K Ctrl+S', action: 'keyboardShortcuts' },
      { separator: true },
      { label: 'About VS Code: Web', action: 'about' },
    ],
  },
];

export function TitleBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const store = useAppStore();

  const handleMenuAction = useCallback((action: string) => {
    switch (action) {
      case 'newFile':
        store.createFile('root-src', 'untitled.ts');
        break;
      case 'newFolder':
        store.createFolder('root-src', 'new-folder');
        break;
      case 'save':
        if (store.activeTabId) store.saveTab(store.activeTabId);
        break;
      case 'saveAll':
        store.editorTabs.forEach((t) => store.saveTab(t.id));
        break;
      case 'closeEditor':
        if (store.activeTabId) store.closeTab(store.activeTabId);
        break;
      case 'showExplorer':
        store.setSidebarView('explorer');
        break;
      case 'showSearch':
        store.setSidebarView('search');
        break;
      case 'showSCM':
        store.setSidebarView('scm');
        break;
      case 'showDebug':
        store.setSidebarView('debug');
        break;
      case 'showExtensions':
        store.setSidebarView('extensions');
        break;
      case 'toggleTerminal':
        store.togglePanel();
        break;
      case 'toggleSidebar':
        store.toggleSidebar();
        break;
      case 'newTerminal':
        store.createTerminalSession();
        if (!store.panelVisible) store.togglePanel();
        break;
      case 'claudeCode':
        store.createTerminalSession();
        if (!store.panelVisible) store.togglePanel();
        break;
      case 'commandPalette':
        break;
      case 'about':
        alert('VS Code: Web v1.0.0\nA fully functional VS Code: replica running in your browser.');
        break;
    }
    setOpenMenu(null);
  }, [store]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="vscode-titlebar" style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* VS Code: Icon */}
        <div style={{ display: 'flex', alignItems: 'center', marginRight: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.583 1.424L9.88 9.127l-5.98-4.59L1.16 6.15v11.7l2.74 1.613 5.98-4.59 7.703 7.703 4.417-2.05V3.474l-4.417-2.05zM3.16 15.9V8.1l4.5 3.9-4.5 3.9zm8.72-3.9l6.12-4.95v9.9l-6.12-4.95z" fill="#007acc"/>
          </svg>
        </div>

        {/* Menu Bar */}
        {MENUS.map((menu) => (
          <div key={menu.label} style={{ position: 'relative' }}>
            <button
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setMenuPos({ x: rect.left, y: rect.bottom });
                setOpenMenu(openMenu === menu.label ? null : menu.label);
              }}
              style={{
                background: openMenu === menu.label ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: '#cccccc',
                fontSize: 12,
                padding: '3px 8px',
                cursor: 'pointer',
                borderRadius: 4,
              }}
              onMouseEnter={() => {
                if (openMenu !== null) setOpenMenu(menu.label);
              }}
            >
              {menu.label}
            </button>
          </div>
        ))}

        {/* Open Menu Dropdown */}
        {openMenu && (
          <div
            ref={menuRef}
            className="dropdown-menu"
            style={{ left: menuPos.x, top: menuPos.y }}
          >
            {MENUS.find((m) => m.label === openMenu)?.items.map((item, i) =>
              item.separator ? (
                <div key={i} className="context-menu-separator" />
              ) : item.submenu ? (
                <div key={i} style={{ position: 'relative' }}>
                  <div
                    className="dropdown-menu-item"
                    style={{ justifyContent: 'space-between' }}
                  >
                    <span>{item.label}</span>
                    <span style={{ color: '#858585', fontSize: 10 }}>▸</span>
                  </div>
                </div>
              ) : (
                <div
                  key={i}
                  className={`dropdown-menu-item ${item.disabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (typeof item.action === 'string') {
                      handleMenuAction(item.action);
                    }
                  }}
                >
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <span className="dropdown-menu-shortcut">{item.shortcut}</span>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Window Title */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        VS Code: Web — workspace
      </div>

      {/* Window Controls */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          style={windowButtonStyle}
          onClick={() => alert('Minimize window')}
          title="Minimize"
        >
          <Minus size={14} />
        </button>
        <button
          style={windowButtonStyle}
          onClick={() => alert('Maximize window')}
          title="Maximize"
        >
          <Square size={12} />
        </button>
        <button
          style={{ ...windowButtonStyle }}
          onClick={() => {
            if (confirm('Are you sure you want to close VS Code: Web?')) {
              window.close();
            }
          }}
          title="Close"
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#e81123'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

const windowButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#cccccc',
  width: 30,
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.15s ease',
};
