import path from 'node:path';
import fs from 'node:fs/promises';

/**
 * All filesystem access is confined to a single workspace root.
 *
 * Even though this server binds to localhost only, confinement still matters:
 * the browser is an untrusted input source (any page/script that can reach
 * localhost could try to walk out of the workspace), and a bug in the UI
 * shouldn't be able to read or overwrite arbitrary files on the device.
 *
 * The check is done by resolving to a real absolute path and verifying it is
 * inside the root, rather than by string-matching for '..' — which is trivially
 * bypassable via encodings, absolute paths, or symlinks.
 */

export class PathError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PathError';
    this.statusCode = 400;
  }
}

let workspaceRoot = null;

export async function initWorkspaceRoot(dir) {
  const resolved = path.resolve(dir);
  await fs.mkdir(resolved, { recursive: true });
  // realpath resolves any symlinks in the root itself so later comparisons are consistent
  workspaceRoot = await fs.realpath(resolved);
  return workspaceRoot;
}

export function getWorkspaceRoot() {
  if (!workspaceRoot) throw new Error('Workspace root not initialized');
  return workspaceRoot;
}

/**
 * Resolve a client-supplied relative path to an absolute path inside the
 * workspace, or throw. Returns the absolute path.
 *
 * `mustExist: false` is used for create/write operations where the target
 * file doesn't exist yet — in that case we validate the parent directory,
 * which does exist, so symlink escapes are still caught.
 *
 * `allowMissingParents: true` additionally permits intermediate directories
 * that don't exist yet, for callers that mkdir -p them (creating `a/b/c.ts`
 * in one go). Containment is still enforced against the deepest ancestor that
 * does exist. Writes deliberately leave this off, so saving into a nonexistent
 * folder reports a clear error instead of silently conjuring directories.
 */
export async function resolveSafe(relPath, { mustExist = true, allowMissingParents = false } = {}) {
  const root = getWorkspaceRoot();

  if (typeof relPath !== 'string') {
    throw new PathError('Path must be a string');
  }

  // Reject NUL bytes outright — they can truncate paths in some syscalls
  if (relPath.includes('\0')) {
    throw new PathError('Invalid path');
  }

  // Treat every incoming path as relative to the workspace root, never as absolute
  const cleaned = relPath.replace(/^[/\\]+/, '');
  const candidate = path.resolve(root, cleaned);

  // First: lexical containment check
  if (!isInside(root, candidate)) {
    throw new PathError('Path escapes workspace root');
  }

  // Second: resolve symlinks and re-check, so a symlink inside the workspace
  // pointing outside of it cannot be used to escape.
  try {
    const real = await fs.realpath(candidate);
    if (!isInside(root, real)) {
      throw new PathError('Path escapes workspace root via symlink');
    }
    return real;
  } catch (err) {
    if (err instanceof PathError) throw err;
    if (err.code === 'ENOENT') {
      if (mustExist) {
        const notFound = new Error('Not found');
        notFound.statusCode = 404;
        throw notFound;
      }
      // Target doesn't exist yet: validate the nearest ancestor that does.
      //
      // With allowMissingParents that ancestor may be several levels up (the
      // caller intends to mkdir -p the rest). That stays safe: the candidate
      // already passed the lexical containment check above, path.resolve has
      // normalized away any '..', and the missing segments cannot be symlinks
      // precisely because they don't exist yet. So if the deepest existing
      // ancestor really lives inside the root, everything created beneath it
      // does too.
      let ancestor = path.dirname(candidate);
      for (;;) {
        try {
          const realAncestor = await fs.realpath(ancestor);
          if (!isInside(root, realAncestor)) {
            throw new PathError('Path escapes workspace root via symlink');
          }
          break;
        } catch (parentErr) {
          if (parentErr instanceof PathError) throw parentErr;
          if (parentErr.code !== 'ENOENT') throw parentErr;
          if (!allowMissingParents) {
            throw new PathError('Parent directory does not exist');
          }
          // Walk up. The root itself always exists, so this terminates.
          const next = path.dirname(ancestor);
          if (next === ancestor) {
            throw new PathError('Path escapes workspace root');
          }
          ancestor = next;
        }
      }
      return candidate;
    }
    throw err;
  }
}

function isInside(root, target) {
  if (target === root) return true;
  const rel = path.relative(root, target);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
}

/** Convert an absolute path back to a workspace-relative path for the client. */
export function toRelative(absPath) {
  const rel = path.relative(getWorkspaceRoot(), absPath);
  return rel === '' ? '.' : rel.split(path.sep).join('/');
}
