# VS Code Web — with a real backend

A VS Code-style editor that runs in your browser and edits **real files** on
disk through a **real shell**, instead of simulating them.

There are two parts:

| Part | Folder | Port | What it does |
|---|---|---|---|
| Frontend | `app/` | 3000 | The editor UI (React + Monaco) |
| Backend | `server/` | 3001 | Real filesystem access + real shell |

The frontend works without the backend, but falls back to an in-memory demo
workspace where nothing is saved to disk. The status bar shows which mode
you're in: **`disk`** (real) or **`demo`** (fallback).

---

## Setup

Run these once:

```bash
cd server && npm install
cd ../app && npm install
```

## Running

You need **two terminals** (in Termux: swipe from the left edge → `NEW SESSION`).

**Terminal 1 — backend:**
```bash
cd server
npm start
```

**Terminal 2 — frontend:**
```bash
cd app
npm run dev
```

Then open **http://localhost:3000** in your browser.

Check the status bar at the bottom: if it says `disk`, you're editing real
files. If it says `demo`, the backend isn't reachable — tap it to retry.

---

## The workspace folder

By default the backend exposes `~/Vs/workspace`. Everything the editor can see
or change lives inside that folder, and nothing outside it is reachable.

To point it somewhere else:

```bash
WORKSPACE=~/my-project npm start
```

When you create a new file you can type a nested path — `src/utils/helper.ts` —
and any missing folders in between are created for you.

Everything is served locally: the editor bundles Monaco rather than fetching it
from a CDN, so it works with no internet connection.

To use a different port:

```bash
PORT=4001 npm start
```

If you change the port, tell the frontend where to find it by creating
`app/.env.local`:

```
VITE_SERVER_URL=http://127.0.0.1:4001
```

---

## Terminal: two modes

The backend spawns a real shell either way, but there are two levels of fidelity.

**Fallback mode (default, always works)** — uses `child_process`. Commands run
for real, output streams back, and files change on disk. What you *don't* get
is a true TTY, so:

- You'll see `bash: no job control in this shell` on startup — harmless.
- Full-screen programs (`vim`, `nano`, `top`, `htop`) won't render correctly.
- Tab-completion and in-shell arrow-key history don't work (the input box has
  its own history via arrow keys).

**Full mode (better, may not install)** — uses `node-pty`, a native module.
This gives you a proper TTY: working `vim`/`nano`, colors, and resize.

To try it:

```bash
cd server
npm install node-pty
```

If it compiles, restart the backend — it detects `node-pty` automatically and
the startup banner will say `Terminal: node-pty`. If the install fails (common
on Termux, since it needs a native toolchain), nothing breaks — the server keeps
using the fallback. On Termux, installing build tools first may help:

```bash
pkg install build-essential python
npm install node-pty
```

---

## Security notes

This server grants real filesystem and shell access, so a few things are
deliberate:

- **Binds to `127.0.0.1` only.** It is not reachable from your network. Do not
  change `HOST` to `0.0.0.0` — there is no authentication, so anyone on the
  network would get a shell on your device.
- **Confined to the workspace folder.** Path traversal (`../../etc/passwd`),
  absolute paths, URL-encoded traversal, and symlinks pointing outside the
  workspace are all rejected. Deleting the workspace root is refused.
- **No auth.** Fine for localhost-only use. If you ever want remote access,
  add authentication first — don't just open the port.

---

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+S` | Save (or tap the **Save** button in the tab bar) |
| `Ctrl+N` | New file |
| `Ctrl+W` | Close tab |
| `` Ctrl+` `` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+E` | Explorer |
| `Ctrl+Shift+F` | Search |

In the terminal: `Ctrl+C` interrupts, `Ctrl+D` sends EOF, `Ctrl+L` clears the
view, arrow keys walk command history.

---

## Mobile

- The sidebar becomes a slide-over drawer; tap outside it to dismiss.
- Resize handles work with touch (drag the divider above the terminal).
- The chevron button in the terminal tab bar maximizes/restores the panel —
  easier than dragging on a small screen.
- The **Save** button exists because `Ctrl+S` needs a hardware keyboard.

---

## Troubleshooting

**Status bar says `demo`** — the backend isn't running or isn't reachable.
Check terminal 1 for errors, then tap the status bar item to retry.

**`Cannot reach the backend server`** — confirm the backend is listening:
```bash
curl http://127.0.0.1:3001/api/health
```

**Terminal says "disconnected"** — the backend died or was never started.
Restart it and reopen the terminal panel.

**File won't open** — files over 2 MB and binary files are rejected on purpose;
Monaco chokes on both.
