/**
 * Client for the local backend (real filesystem + real shell).
 *
 * The backend URL is configurable via VITE_SERVER_URL so the app can run
 * against a server on a different port/host without a rebuild. It defaults
 * to the standard local port.
 */

const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://127.0.0.1:3001';

export function getServerUrl() {
  return SERVER_URL;
}

export function getTerminalWsUrl() {
  return SERVER_URL.replace(/^http/, 'ws') + '/ws/terminal';
}

export interface ApiFileNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: ApiFileNode[];
}

export interface SearchResult {
  path: string;
  line: number;
  text: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Network-level failure almost always means the backend isn't running.
    throw new ApiError(
      'Cannot reach the backend server. Is it running on ' + SERVER_URL + '?',
      0
    );
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      (body as { error?: string } | null)?.error ?? `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

export const api = {
  health: () =>
    request<{
      ok: boolean;
      workspace: string;
      terminalBackend: string;
      ptyLoadError: string | null;
    }>('/api/health'),

  tree: (path = '.', depth = 4) =>
    request<{ root: string; children: ApiFileNode[] }>(
      `/api/files/tree?path=${encodeURIComponent(path)}&depth=${depth}`
    ),

  read: (path: string) =>
    request<{ path: string; content: string }>(
      `/api/files/read?path=${encodeURIComponent(path)}`
    ),

  write: (path: string, content: string) =>
    request<{ ok: boolean; path: string }>('/api/files/write', {
      method: 'POST',
      body: JSON.stringify({ path, content }),
    }),

  create: (path: string, type: 'file' | 'folder') =>
    request<{ ok: boolean; path: string; type: string }>('/api/files/create', {
      method: 'POST',
      body: JSON.stringify({ path, type }),
    }),

  rename: (from: string, to: string) =>
    request<{ ok: boolean; path: string }>('/api/files/rename', {
      method: 'POST',
      body: JSON.stringify({ from, to }),
    }),

  remove: (path: string) =>
    request<{ ok: boolean }>('/api/files/delete', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  search: (q: string, limit = 200) =>
    request<{ results: SearchResult[] }>(
      `/api/files/search?q=${encodeURIComponent(q)}&limit=${limit}`
    ),
};
