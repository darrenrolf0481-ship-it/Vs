# Running a local model

The editor's Bot panel talks to [Ollama](https://ollama.com) running on this
device. Nothing is sent anywhere.

## Where each piece runs

On Android the layout that actually performs is:

```
Termux (native)          proot Ubuntu
  └─ ollama serve   ←──   └─ this server  ←──  browser
     :11434                  :3001              :3000
```

Run **Ollama natively in Termux**, not inside proot. proot works by
intercepting syscalls with `ptrace`; every one pays a tax. Inference is the
most syscall-hungry thing on the device, so it's the one thing you want
outside. proot shares Termux's network stack, so `127.0.0.1:11434` from inside
Ubuntu reaches the Termux-side Ollama with no configuration.

## Setup

In Termux (not inside proot):

```bash
pkg install ollama
ollama serve          # leave this session running
```

In a second Termux session, pull something small:

```bash
ollama pull qwen2.5-coder:1.5b
```

Model sizing is the whole game on a phone. A 1.5B at Q4 wants roughly 1–2 GB
resident and stays responsive. A 7B wants 4–5 GB and will thrash against
Chrome, the Vite dev server, and Android itself. Start small and go up only if
you have headroom.

Keep models in Termux's own home. Android blocks execution permissions on
`/sdcard` and `/storage/emulated/0`.

## Stopping Android from killing it

This is the usual cause of "it worked yesterday". Android suspends Termux and
its low-memory killer reaps proot processes first.

```bash
termux-wake-lock
```

Also disable battery optimization for Termux in Android settings. Without both,
you will spend your time debugging the OS rather than your code.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Where Ollama is listening |
| `OLLAMA_NUM_CTX` | `2048` | Context window. The biggest lever on whether a model loads at all |
| `OLLAMA_HISTORY` | `12` | Prior messages replayed per turn |

```bash
OLLAMA_NUM_CTX=4096 ./start.sh
```

Raising `num_ctx` costs memory quadratically in attention. If a model loads
fine in `ollama run` but dies in the editor, this is the first thing to lower.

## Using it

Open the bottom panel and press the Bot icon. The same button switches back to
the shell — a session is either a terminal or a chat, not both.

Enter sends, Shift+Enter breaks a line. Stop actually aborts generation
upstream rather than just hiding output, which matters when a reply is going
nowhere and the CPU is warm.

## When it doesn't work

The panel reports the real reason and the command that fixes it. The common
ones:

- **"No Ollama server at …"** — `ollama serve` isn't running, or it's running
  inside proot while the editor looks outside it.
- **"…has no models"** — `ollama pull` something.
- **"Pull it first"** — the selected model name isn't downloaded.

To check the backend's own view:

```bash
curl 127.0.0.1:3001/api/ollama/status
```

## Tests

```bash
cd server && node test-ollama.mjs
```

Stands up a fake Ollama and checks the streaming passthrough, the abort path,
and each error case. No model or network needed.

## A note on building

`npm run build` bundles Monaco and needs well over 2 GB of heap — it will OOM
on most phones. `./start.sh` runs Vite in dev mode, which doesn't, so this only
bites if you try to produce a production bundle on-device. If you need one:

```bash
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```
