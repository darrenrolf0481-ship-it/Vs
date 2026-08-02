import { useEffect, useRef, useState, useCallback } from 'react';
import { getTerminalWsUrl } from '@/lib/api';

export type ShellStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseShellOptions {
  /** Called for every chunk of output the shell produces */
  onOutput: (chunk: string) => void;
  /** Whether to open the connection at all */
  enabled?: boolean;
}

/**
 * Maintains a WebSocket connection to a real shell process on the backend.
 *
 * Each hook instance owns exactly one shell process — mounting a second
 * terminal session opens a second, independent shell, which matches how
 * VS Code's terminal tabs behave.
 */
export function useShell({ onOutput, enabled = true }: UseShellOptions) {
  const [status, setStatus] = useState<ShellStatus>('connecting');
  const [backend, setBackend] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep the latest callback in a ref so reconnects aren't triggered by
  // a caller passing a new inline function on every render.
  const onOutputRef = useRef(onOutput);
  useEffect(() => {
    onOutputRef.current = onOutput;
  }, [onOutput]);

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(getTerminalWsUrl());
    } catch {
      setStatus('error');
      setError('Could not open a connection to the shell server.');
      return;
    }

    // A socket from a previous run of this effect must never write status:
    // its close event can land *after* the replacement socket has already
    // reported 'connected', which would leave the UI stuck on 'disconnected'
    // (and the input box disabled) while a perfectly live shell streams
    // output. React's StrictMode remounts every effect in development, so
    // this is the normal path there, not an edge case.
    let current = true;

    wsRef.current = ws;
    setStatus('connecting');

    ws.onopen = () => {
      if (current) setStatus('connected');
    };

    ws.onmessage = (event) => {
      if (!current) return;
      let msg: { type: string; data: string };
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      if (msg.type === 'ready') {
        try {
          const info = JSON.parse(msg.data);
          setBackend(info.backend ?? null);
        } catch {
          // non-fatal
        }
        return;
      }

      if (msg.type === 'output' || msg.type === 'exit') {
        onOutputRef.current(msg.data);
      }
    };

    ws.onerror = () => {
      if (!current) return;
      setStatus('error');
      setError(
        'Lost connection to the shell server. Make sure the backend is running.'
      );
    };

    ws.onclose = () => {
      if (!current) return;
      setStatus((prev) => (prev === 'error' ? 'error' : 'disconnected'));
    };

    return () => {
      current = false;
      wsRef.current = null;
      // Only close sockets that actually finished opening; closing during
      // CONNECTING throws in some browsers.
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CLOSING) {
        ws.close();
      } else if (ws.readyState === WebSocket.CONNECTING) {
        // Still connecting: close as soon as it opens. Guarded above, so this
        // teardown can't report status for a socket nobody is using anymore.
        ws.onopen = () => ws.close();
      }
    };
  }, [enabled]);

  const send = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
      return true;
    }
    return false;
  }, []);

  const resize = useCallback((cols: number, rows: number) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
  }, []);

  return { status, backend, error, send, resize };
}
