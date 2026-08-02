import { useAppStore } from '@/store';
import type { SidebarView } from '@/types';
import { Files, Search, GitBranch, PlayCircle, LayoutGrid } from 'lucide-react';

const VIEWS: Array<{ id: SidebarView; icon: typeof Files; label: string; badge?: number }> = [
  { id: 'explorer', icon: Files, label: 'Explorer' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'scm', icon: GitBranch, label: 'Source Control', badge: 3 },
  { id: 'debug', icon: PlayCircle, label: 'Run and Debug' },
  { id: 'extensions', icon: LayoutGrid, label: 'Extensions' },
];

export function ActivityBar() {
  const { sidebarView, setSidebarView, gitChanges } = useAppStore();

  return (
    <div className="vscode-activity-bar">
      {VIEWS.map((view) => {
        const isActive = sidebarView === view.id;
        const badgeCount = view.id === 'scm' ? gitChanges.length : view.badge;
        const Icon = view.icon;

        return (
          <button
            key={view.id}
            onClick={() => setSidebarView(view.id)}
            title={view.label}
            style={{
              position: 'relative',
              width: 48,
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#ffffff' : '#858585',
              borderLeft: isActive ? '2px solid #007acc' : '2px solid transparent',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#cccccc';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.color = '#858585';
              }
            }}
          >
            <Icon size={24} strokeWidth={isActive ? 2 : 1.5} />

            {/* Badge */}
            {badgeCount !== undefined && badgeCount > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 6,
                  background: '#007acc',
                  color: 'white',
                  fontSize: 9,
                  fontWeight: 'bold',
                  minWidth: 14,
                  height: 14,
                  borderRadius: 7,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {badgeCount}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
