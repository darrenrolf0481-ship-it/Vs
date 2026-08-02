import { useState } from 'react';
import { useAppStore } from '@/store';
import { GitBranch, Check, RefreshCw, FileText, FilePlus, FileMinus, CircleDot } from 'lucide-react';

export function SCMView() {
  const { gitChanges, gitBranch, stageFile, unstageFile } = useAppStore();
  const [commitMessage, setCommitMessage] = useState('');

  const staged = gitChanges.filter((c) => c.staged);
  const unstaged = gitChanges.filter((c) => !c.staged);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'modified': return <CircleDot size={14} color="#cca700" />;
      case 'added': return <FilePlus size={14} color="#4ec9b0" />;
      case 'deleted': return <FileMinus size={14} color="#f48771" />;
      case 'untracked': return <FileText size={14} color="#519aba" />;
      default: return <FileText size={14} color="#858585" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'modified': return 'M';
      case 'added': return 'A';
      case 'deleted': return 'D';
      case 'untracked': return 'U';
      default: return '?';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        borderBottom: '1px solid #3e3e42',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: '#bbbbbb' }}>
          Source Control
        </span>
        <button style={{ background: 'transparent', border: 'none', color: '#cccccc', cursor: 'pointer', padding: 2 }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Branch selector */}
      <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <GitBranch size={14} color="#cccccc" />
        <select
          style={{
            background: '#3c3c3c',
            border: '1px solid #3e3e42',
            color: '#cccccc',
            fontSize: 13,
            padding: '3px 8px',
            flex: 1,
            outline: 'none',
          }}
          value={gitBranch}
          onChange={(e) => useAppStore.getState().setGitBranch(e.target.value)}
        >
          <option>main</option>
          <option>develop</option>
          <option>feature/new-ui</option>
        </select>
      </div>

      {/* Commit message */}
      <div style={{ padding: '4px 12px' }}>
        <textarea
          className="vscode-input"
          placeholder="Message (Ctrl+Enter to commit)"
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          style={{
            width: '100%',
            height: 60,
            resize: 'none',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        />
        <button
          className="vscode-button"
          style={{
            width: '100%',
            marginTop: 4,
            justifyContent: 'center',
            opacity: staged.length === 0 ? 0.5 : 1,
            cursor: staged.length === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={() => {
            if (staged.length > 0 && commitMessage.trim()) {
              alert(`Committed ${staged.length} file(s) with message: "${commitMessage}"`);
              setCommitMessage('');
            }
          }}
          disabled={staged.length === 0}
        >
          <Check size={14} />
          Commit
        </button>
      </div>

      {/* Changes lists */}
      <div className="scrollbars" style={{ flex: 1, overflow: 'auto' }}>
        {/* Staged */}
        {staged.length > 0 && (
          <div>
            <div style={{ padding: '8px 12px 4px', fontSize: 11, color: '#858585', textTransform: 'uppercase' }}>
              Staged Changes ({staged.length})
            </div>
            {staged.map((change) => (
              <div
                key={change.path}
                className="vscode-tree-item"
                style={{ paddingLeft: 12 }}
                onClick={() => unstageFile(change.path)}
              >
                <Check size={14} color="#4ec9b0" />
                {getStatusIcon(change.status)}
                <span className="text-ellipsis">{change.path}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#858585' }}>
                  {getStatusLabel(change.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Unstaged */}
        {unstaged.length > 0 && (
          <div>
            <div style={{ padding: '8px 12px 4px', fontSize: 11, color: '#858585', textTransform: 'uppercase' }}>
              Changes ({unstaged.length})
            </div>
            {unstaged.map((change) => (
              <div
                key={change.path}
                className="vscode-tree-item"
                style={{ paddingLeft: 12 }}
                onClick={() => stageFile(change.path)}
              >
                <div style={{ width: 14, height: 14, border: '1px solid #858585', borderRadius: 2 }} />
                {getStatusIcon(change.status)}
                <span className="text-ellipsis">{change.path}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#858585' }}>
                  {getStatusLabel(change.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {gitChanges.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#858585', fontSize: 13 }}>
            No changes to display
          </div>
        )}
      </div>
    </div>
  );
}
