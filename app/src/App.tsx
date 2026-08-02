import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { TitleBar } from '@/components/layout/TitleBar';
import { ActivityBar } from '@/components/layout/ActivityBar';
import { Sidebar } from '@/components/layout/Sidebar';
import { EditorArea } from '@/components/editor/EditorArea';
import { TerminalPanel } from '@/components/terminal/Terminal';
import { StatusBar } from '@/components/layout/StatusBar';
import { useDragResize } from '@/hooks/use-drag-resize';
import { useIsMobile } from '@/hooks/use-mobile';
import './App.css';

function App() {
  const {
    panelVisible,
    panelHeight,
    sidebarVisible,
    togglePanel,
    toggleSidebar,
    loadState,
    editorTabs,
    closeTab,
    setActiveTab,
    setSidebarView,
    createFile,
    createTerminalSession,
    setPanelHeight,
  } = useAppStore();

  const isMobile = useIsMobile();

  // Load persisted state on mount
  useEffect(() => {
    loadState();
  }, [loadState]);

  // Connect to the local backend (real filesystem + real shell) on mount
  useEffect(() => {
    void useAppStore.getState().connectBackend();
  }, []);

  // Keep a maximized terminal panel filling the viewport on rotation/resize
  useEffect(() => {
    const handleResize = () => useAppStore.getState().syncMaximizedPanelHeight();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+N: New File
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createFile('root-src', 'untitled.ts');
      }

      // Ctrl+W: Close active tab
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault();
        const state = useAppStore.getState();
        if (state.activeTabId) {
          closeTab(state.activeTabId);
        }
      }

      // Ctrl+`: Toggle terminal
      if (e.ctrlKey && e.key === '`') {
        e.preventDefault();
        togglePanel();
      }

      // Ctrl+B: Toggle sidebar
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault();
        toggleSidebar();
      }

      // Ctrl+Shift+E: Explorer
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setSidebarView('explorer');
      }

      // Ctrl+Shift+F: Search
      if (e.ctrlKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        setSidebarView('search');
      }

      // Ctrl+Shift+G: Source Control
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        setSidebarView('scm');
      }

      // Ctrl+Shift+D: Debug
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setSidebarView('debug');
      }

      // Ctrl+Shift+X: Extensions
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        setSidebarView('extensions');
      }

      // Ctrl+Shift+`: New Terminal
      if (e.ctrlKey && e.shiftKey && e.key === '`') {
        e.preventDefault();
        createTerminalSession();
        const state = useAppStore.getState();
        if (!state.panelVisible) state.togglePanel();
      }

      // Ctrl+1/2/3: Focus tab
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (editorTabs[index]) {
          setActiveTab(editorTabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel, toggleSidebar, closeTab, setActiveTab, setSidebarView, createFile, createTerminalSession, editorTabs]);

  // Handle resize for panel — works with mouse, touch, and pen
  const handlePanelResize = useDragResize({
    axis: 'y',
    invert: true, // dragging up should increase panel height
    getValue: () => useAppStore.getState().panelHeight,
    setValue: (h) => setPanelHeight(h),
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#1e1e1e',
    }}>
      {/* Title Bar */}
      <TitleBar />

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Activity Bar */}
        <ActivityBar />

        {/* Sidebar (renders as an inline pane on desktop, a slide-over drawer on mobile) */}
        <Sidebar />

        {/* Backdrop: tapping outside the drawer closes it on mobile */}
        {isMobile && sidebarVisible && (
          <div className="sidebar-backdrop" onClick={toggleSidebar} />
        )}

        {/* Editor + Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          {/* Editor.
              This wrapper must be a flex column: .vscode-editor sizes itself
              with flex: 1, which does nothing inside a block parent — the
              editor then collapses to the height of the tab bar and Monaco
              renders as a few-pixel sliver. minHeight: 0 lets it shrink
              instead of being forced to its content height. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <EditorArea />
          </div>

          {/* Panel Resize Handle — wrapped in a larger invisible touch target */}
          {panelVisible && (
            <div className="resize-handle-h-hitarea" onPointerDown={handlePanelResize}>
              <div className="resize-handle-h" />
            </div>
          )}

          {/* Terminal Panel */}
          {panelVisible && (
            <div style={{ height: panelHeight, minHeight: 100, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TerminalPanel />
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

export default App;
