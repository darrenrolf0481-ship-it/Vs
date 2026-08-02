import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { resolveSafe, toRelative, getWorkspaceRoot } from '../lib/safe-path.js';

const router = express.Router();

// Directories that are noisy, huge, or meaningless to browse in an editor tree.
const IGNORED = new Set(['node_modules', '.git', '.cache', 'dist', 'build', '.next', '__pycache__']);

// Refuse to read files above this size into the editor (binary/huge files will
// hang Monaco and blow up the response). 2 MB is generous for source code.
const MAX_READ_BYTES = 2 * 1024 * 1024;

function asyncRoute(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * GET /api/files/tree?path=<rel>&depth=<n>
 * Returns a nested tree of the workspace (lazily bounded by depth).
 */
router.get('/tree', asyncRoute(async (req, res) => {
  const rel = req.query.path || '.';
  const depth = Math.min(parseInt(req.query.depth ?? '4', 10) || 4, 8);
  const abs = await resolveSafe(rel);
  const tree = await buildTree(abs, depth);
  res.json({ root: toRelative(abs), children: tree });
}));

async function buildTree(dir, depth) {
  if (depth <= 0) return [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const nodes = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const relPath = toRelative(abs);

    if (entry.isDirectory()) {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'folder',
        children: await buildTree(abs, depth - 1),
      });
    } else if (entry.isFile()) {
      nodes.push({
        id: relPath,
        name: entry.name,
        path: relPath,
        type: 'file',
      });
    }
    // symlinks/sockets/devices are intentionally skipped
  }

  // Folders first, then files, each alphabetical — matches VS Code's ordering
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return nodes;
}

/** GET /api/files/read?path=<rel> */
router.get('/read', asyncRoute(async (req, res) => {
  const abs = await resolveSafe(req.query.path);
  const stat = await fs.stat(abs);

  if (!stat.isFile()) {
    return res.status(400).json({ error: 'Not a file' });
  }
  if (stat.size > MAX_READ_BYTES) {
    return res.status(413).json({ error: `File too large to open (${Math.round(stat.size / 1024)} KB)` });
  }

  const buf = await fs.readFile(abs);
  // Heuristic binary check: a NUL byte in the first 8KB means it's not text.
  if (buf.subarray(0, 8192).includes(0)) {
    return res.status(415).json({ error: 'Binary file — cannot open in text editor' });
  }

  res.json({ path: toRelative(abs), content: buf.toString('utf8') });
}));

/** POST /api/files/write  { path, content } */
router.post('/write', asyncRoute(async (req, res) => {
  const { path: relPath, content } = req.body ?? {};
  if (typeof content !== 'string') {
    return res.status(400).json({ error: 'content must be a string' });
  }
  const abs = await resolveSafe(relPath, { mustExist: false });
  await fs.writeFile(abs, content, 'utf8');
  res.json({ ok: true, path: toRelative(abs) });
}));

/** POST /api/files/create  { path, type: 'file'|'folder' } */
router.post('/create', asyncRoute(async (req, res) => {
  const { path: relPath, type } = req.body ?? {};
  if (type !== 'file' && type !== 'folder') {
    return res.status(400).json({ error: "type must be 'file' or 'folder'" });
  }
  // Nested names are allowed here ('src/utils/helper.ts'), matching VS Code's
  // new-file box, so the missing intermediate folders get created below.
  const abs = await resolveSafe(relPath, { mustExist: false, allowMissingParents: true });

  try {
    await fs.access(abs);
    return res.status(409).json({ error: 'Already exists' });
  } catch {
    // doesn't exist — good, proceed
  }

  if (type === 'folder') {
    await fs.mkdir(abs, { recursive: true });
  } else {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, '', { flag: 'wx' });
  }
  res.json({ ok: true, path: toRelative(abs), type });
}));

/** POST /api/files/rename  { from, to } */
router.post('/rename', asyncRoute(async (req, res) => {
  const { from, to } = req.body ?? {};
  const absFrom = await resolveSafe(from);
  const absTo = await resolveSafe(to, { mustExist: false });

  try {
    await fs.access(absTo);
    return res.status(409).json({ error: 'Destination already exists' });
  } catch {
    // free — proceed
  }

  await fs.rename(absFrom, absTo);
  res.json({ ok: true, path: toRelative(absTo) });
}));

/**
 * POST /api/files/delete  { path }
 * Deliberately requires an explicit path and refuses to delete the workspace
 * root itself, so a malformed request can't wipe the whole workspace.
 */
router.post('/delete', asyncRoute(async (req, res) => {
  const abs = await resolveSafe(req.body?.path);
  if (abs === getWorkspaceRoot()) {
    return res.status(400).json({ error: 'Refusing to delete workspace root' });
  }
  await fs.rm(abs, { recursive: true, force: false });
  res.json({ ok: true });
}));

/** GET /api/files/search?q=<term>&limit=<n> — plain substring search across text files */
router.get('/search', asyncRoute(async (req, res) => {
  const q = (req.query.q || '').toString();
  if (!q.trim()) return res.json({ results: [] });
  const limit = Math.min(parseInt(req.query.limit ?? '200', 10) || 200, 500);

  const results = [];
  const root = getWorkspaceRoot();

  async function walk(dir) {
    if (results.length >= limit) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (results.length >= limit) return;
      if (IGNORED.has(entry.name)) continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        let stat;
        try {
          stat = await fs.stat(abs);
        } catch {
          continue;
        }
        if (stat.size > MAX_READ_BYTES) continue;
        let buf;
        try {
          buf = await fs.readFile(abs);
        } catch {
          continue;
        }
        if (buf.subarray(0, 8192).includes(0)) continue; // skip binaries
        const lines = buf.toString('utf8').split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(q)) {
            results.push({
              path: toRelative(abs),
              line: i + 1,
              // Cap the preview so one long minified line can't bloat the response
              text: lines[i].slice(0, 200),
            });
            if (results.length >= limit) break;
          }
        }
      }
    }
  }

  await walk(root);
  res.json({ results });
}));

export default router;
