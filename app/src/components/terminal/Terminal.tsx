import { useState } from 'react';
import { useAppStore } from '@/store';
import { X, Plus, Bot, Terminal as TerminalIcon, ChevronUp, ChevronDown } from 'lucide-react';
import { ShellTerminal } from './ShellTerminal';
import { AiChat } from './AiChat';

/**
 * The bottom panel: terminal tabs plus Problems/Output/Debug Console views.
 *
 * The terminal itself is rendered by <ShellTerminal>, which connects to a real
 * shell process on the backend. The previous in-browser command simulator
 * (fake `ls`/`cd` against a virtual filesystem) has been removed — it was
 * replaced by the real thing rather than kept alongside it, so there's no
 * ambiguity about whether a command actually ran.
 */
export function TerminalPanel() {
  const {
    terminalSessions,
    activeTerminalId,
    switchTerminal,
    createTerminalSession,
    closeTerminal,
    panelMaximized,
    togglePanelMaximize,
    toggleClaudeMode,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'terminal' | 'problems' | 'output' | 'debug-console'>('terminal');

  const activeSession = terminalSessions.find((s) => s.id === activeTerminalId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel Tabs */}
      <div className="panel-tab-row" style={{
        display: 'flex',
        alignItems: 'center',
        background: '#252526',
        borderBottom: '1px solid #3e3e42',
        height: 35,
        minHeight: 35,
        paddingLeft: 8,
      }}>
        {[
          { id: 'terminal' as const, label: 'Terminal', icon: TerminalIcon },
          { id: 'problems' as const, label: 'Problems', icon: null },
          { id: 'output' as const, label: 'Output', icon: null },
          { id: 'debug-console' as const, label: 'Debug Console', icon: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? '#1e1e1e' : 'transparent',
              border: 'none',
              borderTop: activeTab === tab.id ? '1px solid #007acc' : '1px solid transparent',
              color: activeTab === tab.id ? '#cccccc' : '#858585',
              fontSize: 12,
              padding: '0 12px',
              height: '100%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {tab.icon && <tab.icon size={14} />}
            {tab.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, paddingRight: 8 }}>
          {/* Terminal session tabs */}
          {terminalSessions.map((s) => (
            <button
              key={s.id}
              onClick={() => switchTerminal(s.id)}
              style={{
                background: s.id === activeTerminalId ? '#1e1e1e' : 'transparent',
                border: 'none',
                color: s.id === activeTerminalId ? '#cccccc' : '#858585',
                fontSize: 11,
                padding: '2px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                borderRadius: 3,
              }}
            >
              {s.claudeMode ? <Bot size={12} color="#d4a5ff" /> : <TerminalIcon size={12} />}
              {s.name}
              <span
                onClick={(e) => { e.stopPropagation(); closeTerminal(s.id); }}
                style={{ cursor: 'pointer', padding: '0 2px' }}
              >
                <X size={10} />
              </span>
            </button>
          ))}

          <button
            onClick={() => activeSession && toggleClaudeMode(activeSession.id)}
            title={activeSession?.claudeMode ? 'Back to shell' : 'Ask a local model'}
            disabled={!activeSession}
            style={{
              background: activeSession?.claudeMode ? '#3c2a4d' : 'transparent',
              border: 'none',
              color: activeSession?.claudeMode ? '#d4a5ff' : '#858585',
              cursor: activeSession ? 'pointer' : 'default',
              padding: '2px 6px',
              borderRadius: 3,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Bot size={14} />
          </button>

          <button
            onClick={createTerminalSession}
            title="New Terminal"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            <Plus size={14} />
          </button>

          <button
            onClick={togglePanelMaximize}
            title={panelMaximized ? 'Restore Panel Size' : 'Maximize Panel'}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              padding: '2px 6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {panelMaximized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Terminal Content — a REAL shell process, or a REAL local model.
          Both sides of this toggle talk to something that actually exists;
          neither is a simulation. */}
      {activeTab === 'terminal' && activeSession && (
        activeSession.claudeMode
          ? <AiChat key={`ai-${activeSession.id}`} />
          : <ShellTerminal key={activeSession.id} sessionKey={activeSession.id} />
      )}

      {activeTab === 'problems' && (
        <div style={{ flex: 1, padding: 12, color: '#858585', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: '#f48771' }}>●</span>
            <span>src/app.ts:10 — Type 'string' is not assignable to type 'number'</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#cca700' }}>●</span>
            <span>src/index.ts:4 — 'app' is declared but its value is never read</span>
          </div>
        </div>
      )}

      {activeTab === 'output' && (
        <div style={{ flex: 1, padding: 12, color: '#858585', fontSize: 13 }}>
          [info] Extension host started
          {'\n'}[info] TypeScript language service initialized
          {'\n'}[info] ESLint server running in node v20.12.0
        </div>
      )}

      {activeTab === 'debug-console' && (
        <div style={{ flex: 1, padding: 12, color: '#858585', fontSize: 13 }}>
          Debug console ready. Start debugging to see output.
        </div>
      )}
    </div>
  );
}
