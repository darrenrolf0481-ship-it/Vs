import { spawn } from 'node:child_process';
import { WebSocketServer } from 'ws';
import { getWorkspaceRoot } from './safe-path.js';

/**
 * Real shell over WebSocket.
 *
 * Two backends:
 *  - node-pty (preferred): a true PTY, so interactive programs (vim, nano,
 *    top), colors, line editing, and resize all behave correctly.
 *  - child_process.spawn (fallback): no native build required, works anywhere
 *    Node runs — including Termux where native modules often fail to compile.
 *    Commands run and stream output, but there's no TTY, so full-screen
 *    interactive programs won't render properly.
 *
 * We try to load node-pty at startup and fall back automatically.
 */

let pty = null;
let ptyLoadError = null;

try {
  const mod = await import('node-pty');
  pty = mod.default ?? mod;
} catch (err) {
  ptyLoadError = err;
}

export function getTerminalBackend() {
  return pty ? 'node-pty' : 'child_process';
}

export function getPtyLoadError() {
  return ptyLoadError ? (ptyLoadError.message || String(ptyLoadError)) : null;
}

function pickShell() {
  if (process.env.SHELL) return process.env.SHELL;
  if (process.platform === 'win32') return 'powershell.exe';
  // Termux's bash lives under its own prefix; fall back through common options
  const prefix = process.env.PREFIX;
  if (prefix) return `${prefix}/bin/bash`;
  return '/bin/bash';
}

export function attachTerminalServer(httpServer, { path: wsPath = '/ws/terminal' } = {}) {
  const wss = new WebSocketServer({ server: httpServer, path: wsPath });

  wss.on('connection', (ws) => {
    const shell = pickShell();
    const cwd = getWorkspaceRoot();
    const env = { ...process.env, TERM: 'xterm-256color' };

    let child = null;
    let killed = false;

    const send = (type, data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type, data }));
      }
    };

    try {
      if (pty) {
        child = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: 80,
          rows: 24,
          cwd,
          env,
        });
        child.onData((data) => send('output', data));
        child.onExit(({ exitCode }) => {
          send('exit', `\r\n[process exited with code ${exitCode}]\r\n`);
          if (ws.readyState === ws.OPEN) ws.close();
        });
      } else {
        // Fallback: interactive bash without a TTY.
        // -i gives us a usable interactive shell; stderr is merged into the
        // output stream so errors show up in the terminal like they should.
        child = spawn(shell, ['-i'], { cwd, env });
        child.stdout.on('data', (d) => send('output', d.toString('utf8')));
        child.stderr.on('data', (d) => send('output', d.toString('utf8')));
        child.on('exit', (code) => {
          send('exit', `\r\n[process exited with code ${code}]\r\n`);
          if (ws.readyState === ws.OPEN) ws.close();
        });
        child.on('error', (err) => {
          send('output', `\r\n[failed to start shell: ${err.message}]\r\n`);
        });
      }
    } catch (err) {
      send('output', `\r\n[failed to start shell: ${err.message}]\r\n`);
      ws.close();
      return;
    }

    send('ready', JSON.stringify({ backend: getTerminalBackend(), shell, cwd }));

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      if (msg.type === 'input' && typeof msg.data === 'string') {
        if (pty) {
          child.write(msg.data);
        } else {
          child.stdin.write(msg.data);
        }
        return;
      }

      if (msg.type === 'resize' && pty) {
        const cols = Math.max(1, Math.min(500, parseInt(msg.cols, 10) || 80));
        const rows = Math.max(1, Math.min(200, parseInt(msg.rows, 10) || 24));
        try {
          child.resize(cols, rows);
        } catch {
          // resize can throw if the process already exited; harmless
        }
      }
    });

    const cleanup = () => {
      if (killed) return;
      killed = true;
      try {
        if (pty) child.kill();
        else child.kill('SIGHUP');
      } catch {
        // already gone
      }
    };

    ws.on('close', cleanup);
    ws.on('error', cleanup);
  });

  return wss;
}
