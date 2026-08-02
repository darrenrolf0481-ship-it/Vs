import { useAppStore } from '@/store';
import { ExplorerView } from '@/components/sidebar/ExplorerView';
import { SearchView } from '@/components/sidebar/SearchView';
import { SCMView } from '@/components/sidebar/SCMView';
import { DebugView } from '@/components/sidebar/DebugView';
import { ExtensionsView } from '@/components/sidebar/ExtensionsView';
import { useDragResize } from '@/hooks/use-drag-resize';
import { useIsMobile } from '@/hooks/use-mobile';

export function Sidebar() {
  const { sidebarVisible, sidebarView, sidebarWidth, setSidebarWidth } = useAppStore();
  const isMobile = useIsMobile();

  const handleResize = useDragResize({
    axis: 'x',
    getValue: () => useAppStore.getState().sidebarWidth,
    setValue: (w) => setSidebarWidth(w),
  });

  if (!sidebarVisible) return null;

  const renderView = () => {
    switch (sidebarView) {
      case 'explorer': return <ExplorerView />;
      case 'search': return <SearchView />;
      case 'scm': return <SCMView />;
      case 'debug': return <DebugView />;
      case 'extensions': return <ExtensionsView />;
    }
  };

  if (isMobile) {
    // On small screens the sidebar becomes a slide-over drawer (fixed width,
    // floats above the editor) instead of permanently eating editor space.
    return (
      <div className="vscode-sidebar vscode-sidebar-mobile scrollbars">
        {renderView()}
      </div>
    );
  }

  return (
    <>
      <div className="vscode-sidebar scrollbars" style={{ width: sidebarWidth, minWidth: 150 }}>
        {renderView()}
      </div>
      {/* Resize Handle — wrapped in a larger invisible touch target */}
      <div className="resize-handle-v-hitarea" onPointerDown={handleResize}>
        <div className="resize-handle-v" />
      </div>
    </>
  );
}
