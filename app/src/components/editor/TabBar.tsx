import { useAppStore } from '@/store';
import { X, FileCode, Save } from 'lucide-react';

export function TabBar() {
  const { editorTabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeAllTabs, saveTab } = useAppStore();

  if (editorTabs.length === 0) return null;

  const activeTab = editorTabs.find((t) => t.id === activeTabId);

  return (
    <div style={{
      display: 'flex',
      background: '#252526',
      height: 35,
      overflowX: 'auto',
      overflowY: 'hidden',
    }}>
      {editorTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`vscode-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              const menu = document.createElement('div');
              menu.className = 'context-menu';
              menu.style.left = `${e.clientX}px`;
              menu.style.top = `${e.clientY}px`;

              const items = [
                { label: 'Close', action: () => { closeTab(tab.id); menu.remove(); } },
                { label: 'Close Others', action: () => { closeOtherTabs(tab.id); menu.remove(); } },
                { label: 'Close All', action: () => { closeAllTabs(); menu.remove(); } },
              ];

              items.forEach((item) => {
                const div = document.createElement('div');
                div.className = 'context-menu-item';
                div.textContent = item.label;
                div.onclick = item.action;
                menu.appendChild(div);
              });

              document.body.appendChild(menu);
              const closeMenu = () => { menu.remove(); document.removeEventListener('mousedown', closeMenu); };
              setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
            }}
          >
            <FileCode size={14} color={isActive ? '#519aba' : '#858585'} />
            <span style={{ marginLeft: 4 }}>{tab.name}</span>
            {tab.modified && <span style={{ color: '#cccccc', marginLeft: 2 }}>●</span>}
            <button
              style={{
                marginLeft: 6,
                background: 'transparent',
                border: 'none',
                color: '#858585',
                cursor: 'pointer',
                padding: 1,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 3,
              }}
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = '#3e3e42';
                (e.currentTarget as HTMLButtonElement).style.color = '#cccccc';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                (e.currentTarget as HTMLButtonElement).style.color = '#858585';
              }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}

      {/* Save button — Ctrl+S isn't reachable without a hardware keyboard,
          so the primary save action needs to be tappable. */}
      <button
        onClick={() => activeTabId && saveTab(activeTabId)}
        disabled={!activeTab?.modified}
        title={activeTab?.modified ? 'Save (Ctrl+S)' : 'No unsaved changes'}
        style={{
          marginLeft: 'auto',
          position: 'sticky',
          right: 0,
          background: activeTab?.modified ? '#0e639c' : '#252526',
          border: 'none',
          color: activeTab?.modified ? '#ffffff' : '#5a5a5a',
          cursor: activeTab?.modified ? 'pointer' : 'default',
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 12,
          flexShrink: 0,
        }}
      >
        <Save size={14} />
        Save
      </button>
    </div>
  );
}
