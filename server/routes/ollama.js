import express from 'express';

const router = express.Router();

/**
 * Where Ollama is listening.
 *
 * On Android the right setup is Ollama running NATIVELY in Termux
 * (`pkg install ollama && ollama serve`) while this server runs inside your
 * proot Ubuntu. proot only translates filesystem syscalls — it shares Termux's
 * network stack — so 127.0.0.1 reaches the Termux-side Ollama just fine, and
 * inference avoids the proot ptrace overhead entirely.
 */
const OLLAMA_URL = (process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434').replace(/\/$/, '');

/**
 * Context window, in tokens. Deliberately small: on a phone this is the single
 * biggest lever on whether a model loads at all. Raise it if you have headroom.
 */
const NUM_CTX = parseInt(process.env.OLLAMA_NUM_CTX ?? '2048', 10);

/**
 * How many prior messages to send back. Whole-conversation replay is what makes
 * a local model crawl after a dozen turns — the prompt gets re-processed every
 * time. Keeping a window bounds that cost.
 */
const HISTORY_LIMIT = parseInt(process.env.OLLAMA_HISTORY ?? '12', 10);

const DEFAULT_SYSTEM =
  'You are a coding assistant embedded in a code editor. Be concise. ' +
  'When you output code, use fenced code blocks and name the language.';

/** Ollama being down is the common case, not an exceptional one. Say so plainly. */
function unreachable(err) {
  const cause = err?.cause?.code ?? err?.code;
  if (cause === 'ECONNREFUSED' || cause === 'ENOTFOUND' || cause === 'EHOSTUNREACH') {
    return `No Ollama server at ${OLLAMA_URL}. Start it in Termux with: ollama serve`;
  }
  return err?.message || 'Could not reach Ollama.';
}

/**
 * Is Ollama up, and what has it got loaded?
 * Returns 200 with ok:false rather than an error status — "not running" is a
 * state the UI renders, not a request that failed.
 */
router.get('/status', async (req, res, next) => {
  try {
    const upstream = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!upstream.ok) {
      return res.json({
        ok: false,
        url: OLLAMA_URL,
        models: [],
        error: `Ollama answered with ${upstream.status}.`,
      });
    }

    const body = await upstream.json();
    const models = (body.models ?? []).map((m) => ({
      name: m.name,
      size: m.size ?? null,
      family: m.details?.family ?? null,
      parameterSize: m.details?.parameter_size ?? null,
      quantization: m.details?.quantization_level ?? null,
    }));

    res.json({ ok: true, url: OLLAMA_URL, numCtx: NUM_CTX, models });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      return res.json({
        ok: false,
        url: OLLAMA_URL,
        models: [],
        error: `Ollama at ${OLLAMA_URL} did not answer within 5s.`,
      });
    }
    if (err instanceof TypeError) {
      return res.json({ ok: false, url: OLLAMA_URL, models: [], error: unreachable(err) });
    }
    next(err);
  }
});

/**
 * Streaming chat proxy.
 *
 * Ollama emits newline-delimited JSON; we pass those bytes straight through
 * rather than buffering, so tokens appear as they're generated. On a phone that
 * difference is the whole user experience — a 40-second silent wait reads as a
 * hang, the same 40 seconds with text arriving reads as thinking.
 */
router.post('/chat', async (req, res, next) => {
  const { model, messages, system } = req.body ?? {};

  if (typeof model !== 'string' || !model.trim()) {
    return res.status(400).json({ error: 'A model name is required.' });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'At least one message is required.' });
  }

  const trimmed = messages.slice(-HISTORY_LIMIT).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? ''),
  }));

  const payload = {
    model,
    stream: true,
    messages: [
      { role: 'system', content: typeof system === 'string' && system.trim() ? system : DEFAULT_SYSTEM },
      ...trimmed,
    ],
    options: { num_ctx: NUM_CTX },
  };

  // Abort the upstream generation when the browser goes away. Without this a
  // closed tab leaves the model chewing CPU and battery to no purpose.
  //
  // This listens on the RESPONSE, not the request: `req`'s 'close' fires as
  // soon as Express finishes reading the body, which would abort every call
  // the instant it started. `res` closing while we still have writing to do is
  // the real signal that the client hung up.
  const controller = new AbortController();
  let clientGone = false;
  res.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      controller.abort();
    }
  });

  let upstream;
  try {
    upstream = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (clientGone) return;
    return res.status(502).json({ error: unreachable(err) });
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    let message = `Ollama returned ${upstream.status}.`;
    try {
      const parsed = JSON.parse(detail);
      if (parsed?.error) message = parsed.error;
    } catch {
      if (detail) message = detail.slice(0, 400);
    }
    // A 404 here almost always means the model name isn't pulled yet.
    if (upstream.status === 404) {
      message += ` Pull it first: ollama pull ${model}`;
    }
    return res.status(502).json({ error: message });
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    for await (const chunk of upstream.body) {
      if (clientGone) break;
      res.write(chunk);
    }
  } catch (err) {
    if (!clientGone && !res.writableEnded) {
      // Headers are already sent, so the error has to travel in-band as one
      // more NDJSON record. The client checks every record for `error`.
      res.write(JSON.stringify({ error: err?.message ?? 'Stream interrupted.' }) + '\n');
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
});

/** Model list for the picker, without the status envelope. */
router.get('/models', async (req, res, next) => {
  try {
    const upstream = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!upstream.ok) {
      return res.status(502).json({ error: `Ollama returned ${upstream.status}.` });
    }
    const body = await upstream.json();
    res.json({ models: (body.models ?? []).map((m) => m.name) });
  } catch (err) {
    if (err instanceof TypeError || err?.name === 'TimeoutError') {
      return res.status(502).json({ error: unreachable(err) });
    }
    next(err);
  }
});

export default router;
export { OLLAMA_URL };
