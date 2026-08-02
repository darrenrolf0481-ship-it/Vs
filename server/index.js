import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import express from 'express';
import cors from 'cors';

import { initWorkspaceRoot, getWorkspaceRoot, PathError } from './lib/safe-path.js';
import filesRouter from './routes/files.js';
import { attachTerminalServer, getTerminalBackend, getPtyLoadError } from './lib/terminal.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Bind to loopback by default. This server grants real filesystem and shell
// access, so it must not be reachable from the network without auth. Setting
// HOST to anything else is an explicit, deliberate choice by the operator.
const HOST = process.env.HOST ?? '127.0.0.1';

// Workspace root: everything the editor can see or touch. Defaults to a
// dedicated folder rather than $HOME so a stray request can't wander through
// unrelated files.
const WORKSPACE = process.env.WORKSPACE ?? path.join(os.homedir(), 'Vs', 'workspace');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    workspace: getWorkspaceRoot(),
    terminalBackend: getTerminalBackend(),
    ptyLoadError: getPtyLoadError(),
  });
});

app.use('/api/files', filesRouter);

// Central error handler — keeps internal paths and stack traces out of responses
app.use((err, req, res, _next) => {
  const status = err.statusCode ?? (err instanceof PathError ? 400 : 500);
  if (status >= 500) {
    console.error('[server error]', err);
  }
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const server = http.createServer(app);

async function main() {
  const root = await initWorkspaceRoot(WORKSPACE);
  attachTerminalServer(server);

  server.listen(PORT, HOST, () => {
    const backend = getTerminalBackend();
    console.log('');
    console.log('  VS Code Web — backend running');
    console.log(`  URL:       http://${HOST}:${PORT}`);
    console.log(`  Workspace: ${root}`);
    console.log(`  Terminal:  ${backend}`);
    if (backend === 'child_process') {
      console.log('             (node-pty unavailable — using fallback shell.');
      console.log('              Commands work; full-screen TUI apps like vim will not.)');
    }
    console.log('');
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
