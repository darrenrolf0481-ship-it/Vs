import { useAppStore } from '@/store';
import { GitBranch, AlertCircle, AlertTriangle, Bell, Smile, HardDrive, CloudOff } from 'lucide-react';

export function StatusBar() {
  const {
    gitBranch, editorTabs, activeTabId, gitChanges,
    backendConnected, workspacePath, backendError,
  } = useAppStore();

  const activeTab = editorTabs.find((t) => t.id === activeTabId);
  const modifiedCount = editorTabs.filter((t) => t.modified).length;

  return (
    <div className="vscode-statusbar" style={{ justifyContent: 'space-between' }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Backend / workspace status — makes it unambiguous whether edits
            are hitting real files on disk or the in-memory demo workspace. */}
        <button
          style={{
            ...statusItemStyle,
            color: backendConnected ? '#ffffff' : '#ffcc66',
          }}
          onClick={() => void useAppStore.getState().connectBackend()}
          title={
            backendConnected
              ? `Connected to local server — editing real files in ${workspacePath}`
              : `${backendError ?? 'Backend not connected'} — click to retry. Running on the in-memory demo workspace.`
          }
        >
          {backendConnected ? <HardDrive size={12} /> : <CloudOff size={12} />}
          <span>{backendConnected ? 'disk' : 'demo'}</span>
        </button>

        {/* Git branch */}
        <button
          style={statusItemStyle}
          onClick={() => useAppStore.getState().setSidebarView('scm')}
          title="Source Control"
        >
          <GitBranch size={12} />
          <span>{gitBranch}</span>
          {gitChanges.length > 0 && (
            <span style={{ opacity: 0.8 }}>({gitChanges.filter((c) => c.staged).length}/{gitChanges.length})</span>
          )}
        </button>

        {/* Error count */}
        <button
          style={statusItemStyle}
          onClick={() => {}}
          title="2 Errors"
        >
          <AlertCircle size={12} />
          <span>2</span>
        </button>

        {/* Warning count */}
        <button
          style={statusItemStyle}
          onClick={() => {}}
          title="1 Warning"
        >
          <AlertTriangle size={12} />
          <span>1</span>
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Modified files */}
        {modifiedCount > 0 && (
          <span style={statusItemStyle}>
            {modifiedCount} unsaved
          </span>
        )}

        {/* Language mode */}
        {activeTab && (
          <button
            style={statusItemStyle}
            onClick={() => alert(`Language mode: ${activeTab.language}`)}
          >
            {activeTab.language}
          </button>
        )}

        {/* Encoding */}
        <button
          style={statusItemStyle}
          onClick={() => alert('Encoding: UTF-8')}
        >
          UTF-8
        </button>

        {/* Line ending */}
        <button
          style={statusItemStyle}
          onClick={() => alert('Line ending: LF')}
        >
          LF
        </button>

        {/* Notifications */}
        <button
          style={statusItemStyle}
          onClick={() => alert('No notifications')}
          title="Notifications"
        >
          <Bell size={12} />
        </button>

        {/* Feedback */}
        <button
          style={statusItemStyle}
          onClick={() => alert('Send feedback about VS Code: Web')}
          title="Send Feedback"
        >
          <Smile size={12} />
        </button>
      </div>
    </div>
  );
}

const statusItemStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: 12,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '2px 6px',
  borderRadius: 2,
  transition: 'background 0.1s ease',
};
