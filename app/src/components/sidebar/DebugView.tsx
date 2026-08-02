import { useState } from 'react';
import {
  Play, Square, SkipForward, SkipBack, RefreshCw,
  ChevronRight, ChevronDown, Bug, ListTree
} from 'lucide-react';

export function DebugView() {
  const [isDebugging, setIsDebugging] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['variables', 'watch', 'callstack', 'breakpoints']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const Section = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div>
      <div
        className="vscode-tree-item"
        style={{ paddingLeft: 8, fontSize: 11, textTransform: 'uppercase', color: '#858585' }}
        onClick={() => toggleSection(id)}
      >
        {expandedSections.has(id) ? (
          <ChevronDown size={14} />
        ) : (
          <ChevronRight size={14} />
        )}
        <span>{title}</span>
      </div>
      {expandedSections.has(id) && children}
    </div>
  );

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
          Run and Debug
        </span>
      </div>

      {/* Debug Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid #3e3e42',
      }}>
        {!isDebugging ? (
          <button
            className="vscode-button"
            onClick={() => setIsDebugging(true)}
            style={{ gap: 4 }}
          >
            <Play size={14} />
            Run
          </button>
        ) : (
          <>
            <button className="vscode-button secondary" onClick={() => setIsDebugging(false)}>
              <Square size={14} />
            </button>
            <button className="vscode-button secondary">
              <SkipBack size={14} />
            </button>
            <button className="vscode-button secondary">
              <SkipForward size={14} />
            </button>
            <button className="vscode-button secondary">
              <RefreshCw size={14} />
            </button>
          </>
        )}
        <select
          style={{
            background: '#3c3c3c',
            border: '1px solid #3e3e42',
            color: '#cccccc',
            fontSize: 12,
            padding: '2px 8px',
            flex: 1,
            outline: 'none',
          }}
        >
          <option>Node.js: Launch Program</option>
          <option>Node.js: Attach</option>
          <option>Chrome: Launch</option>
        </select>
      </div>

      {/* Debug Panels */}
      <div className="scrollbars" style={{ flex: 1, overflow: 'auto' }}>
        <Section title="Variables" id="variables">
          {isDebugging ? (
            <div>
              <div className="vscode-tree-item" style={{ paddingLeft: 24 }}>
                <span style={{ color: '#4fc1ff' }}>local</span>
              </div>
              <div className="vscode-tree-item" style={{ paddingLeft: 40 }}>
                <span style={{ color: '#9cdcfe' }}>app</span>
                <span style={{ color: '#858585', marginLeft: 8 }}>App</span>
              </div>
              <div className="vscode-tree-item" style={{ paddingLeft: 40 }}>
                <span style={{ color: '#9cdcfe' }}>version</span>
                <span style={{ color: '#ce9178', marginLeft: 8 }}>&quot;1.0.0&quot;</span>
              </div>
              <div className="vscode-tree-item" style={{ paddingLeft: 40 }}>
                <span style={{ color: '#9cdcfe' }}>isRunning</span>
                <span style={{ color: '#569cd6', marginLeft: 8 }}>true</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', color: '#858585', fontSize: 12 }}>
              Not running
            </div>
          )}
        </Section>

        <Section title="Watch" id="watch">
          <div style={{ padding: '8px 12px', color: '#858585', fontSize: 12 }}>
            Add expression to watch
          </div>
        </Section>

        <Section title="Call Stack" id="callstack">
          {isDebugging ? (
            <div>
              <div className="vscode-tree-item" style={{ paddingLeft: 24 }}>
                <Bug size={14} color="#f48771" />
                <span>App.initialize (app.ts:5)</span>
              </div>
              <div className="vscode-tree-item" style={{ paddingLeft: 24 }}>
                <ListTree size={14} color="#858585" />
                <span>&lt;anonymous&gt; (index.ts:4)</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '8px 12px', color: '#858585', fontSize: 12 }}>
              Not running
            </div>
          )}
        </Section>

        <Section title="Breakpoints" id="breakpoints">
          <div style={{ padding: '8px 12px', color: '#858585', fontSize: 12 }}>
            No breakpoints
          </div>
        </Section>
      </div>
    </div>
  );
}
