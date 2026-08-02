import { useState, useRef, useEffect, useCallback } from 'react';
import { useShell } from '@/hooks/use-shell';
import { stripAnsi } from '@/lib/ansi';

/**
 * A terminal wired to a REAL shell process on the backend.
 *
 * Deliberately simple rendering: the backend's fallback mode has no PTY, so
 * full cursor-addressing (what xterm.js handles) isn't meaningful there.
 * We strip ANSI control sequences and append text, which is correct for
 * normal command output — the common case.
 */
export function ShellTerminal({ sessionKey }: { sessionKey: string }) {
  const [output, setOutput] = useState('');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOutput = useCallback((chunk: string) => {
    setOutput((prev) => {
      const next = prev + stripAnsi(chunk);
      // Cap retained scrollback so a runaway command (e.g. `yes`) can't grow
      // the string unbounded and freeze the tab.
      const MAX = 200_000;
      return next.length > MAX ? next.slice(next.length - MAX) : next;
    });
  }, []);

  const { status, backend, error, send } = useShell({ onOutput: handleOutput });

  // Auto-scroll to the newest output
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  useEffect(() => {
    if (status === 'connected') inputRef.current?.focus();
  }, [status, sessionKey]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== 'connected') return;

    // Echo the command locally: without a PTY the shell doesn't echo input
    // back to us, so the user would otherwise not see what they typed.
    setOutput((prev) => prev + input + '\n');
    send(input + '\n');

    if (input.trim()) {
      setHistory((h) => [...h.slice(-499), input]);
    }
    setInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Ctrl+C — interrupt the running process
    if (e.ctrlKey && e.key === 'c') {
      e.preventDefault();
      send('\x03');
      setOutput((prev) => prev + '^C\n');
      setInput('');
      return;
    }

    // Ctrl+D — EOF
    if (e.ctrlKey && e.key === 'd') {
      e.preventDefault();
      send('\x04');
      return;
    }

    // Ctrl+L — clear the view (local only; doesn't disturb the shell)
    if (e.ctrlKey && e.key === 'l') {
      e.preventDefault();
      setOutput('');
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = Math.min(historyIndex + 1, history.length - 1);
      setHistoryIndex(next);
      setInput(history[history.length - 1 - next]);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex <= 0) {
        setHistoryIndex(-1);
        setInput('');
        return;
      }
      const next = historyIndex - 1;
      setHistoryIndex(next);
      setInput(history[history.length - 1 - next]);
    }
  };

  const statusColor =
    status === 'connected' ? '#4ec9b0' : status === 'connecting' ? '#cca700' : '#f48771';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Connection status strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '3px 10px',
          background: '#252526',
          borderBottom: '1px solid #3e3e42',
          fontSize: 11,
          color: '#858585',
          flexShrink: 0,
        }}
      >
        <span style={{ color: statusColor }}>●</span>
        <span>
          {status === 'connected'
            ? `real shell${backend ? ` (${backend})` : ''}`
            : status === 'connecting'
              ? 'connecting…'
              : 'disconnected'}
        </span>
      </div>

      {error && (
        <div
          style={{
            padding: '8px 12px',
            background: '#3a1d1d',
            color: '#f48771',
            fontSize: 12,
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            flexShrink: 0,
          }}
        >
          {error}
        </div>
      )}

      <div
        ref={scrollRef}
        className="scrollbars"
        onClick={() => inputRef.current?.focus()}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 12px',
          background: '#1e1e1e',
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.5,
          color: '#cccccc',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          cursor: 'text',
        }}
      >
        {output}
      </div>

      <form
        onSubmit={submit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderTop: '1px solid #3e3e42',
          background: '#1e1e1e',
          flexShrink: 0,
        }}
      >
        <span style={{ color: '#4ec9b0', fontFamily: 'monospace', fontSize: 13 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={status !== 'connected'}
          placeholder={status === 'connected' ? '' : 'shell unavailable'}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#cccccc',
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: 13,
            outline: 'none',
            flex: 1,
            minWidth: 0,
            caretColor: '#cccccc',
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
        />
      </form>
    </div>
  );
}
