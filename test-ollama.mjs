/**
 * Throwaway harness: stands up a fake Ollama, points the real router at it,
 * and exercises the happy path plus the failure paths. Run with:
 *   node test-ollama.mjs
 */
import express from 'express';
import http from 'node:http';

const FAKE_OLLAMA_PORT = 21434;
process.env.OLLAMA_URL = `http://127.0.0.1:${FAKE_OLLAMA_PORT}`;

const { default: ollamaRouter } = await import('./routes/ollama.js');

// ---- fake Ollama --------------------------------------------------------
const fake = express();
fake.use(express.json());

fake.get('/api/tags', (req, res) => {
  res.json({
    models: [
      {
        name: 'qwen2.5-coder:1.5b',
        size: 1_100_000_000,
        details: { family: 'qwen2', parameter_size: '1.5B', quantization_level: 'Q4_K_M' },
      },
      { name: 'gemma2:2b', size: 1_600_000_000, details: { family: 'gemma2' } },
    ],
  });
});

fake.post('/api/chat', (req, res) => {
  if (req.body.model === 'missing-model') {
    return res.status(404).json({ error: 'model not found' });
  }
  res.setHeader('Content-Type', 'application/x-ndjson');
  const words = ['Here', ' is', ' a', ' streamed', ' reply.'];
  let i = 0;
  const t = setInterval(() => {
    if (i < words.length) {
      res.write(JSON.stringify({ message: { role: 'assistant', content: words[i++] }, done: false }) + '\n');
    } else {
      clearInterval(t);
      res.write(JSON.stringify({ done: true }) + '\n');
      res.end();
    }
  }, 10);
});

const fakeServer = http.createServer(fake);
await new Promise((r) => fakeServer.listen(FAKE_OLLAMA_PORT, '127.0.0.1', r));

// ---- app under test -----------------------------------------------------
const app = express();
app.use(express.json());
app.use('/api/ollama', ollamaRouter);
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

let lastLabel = 'startup';
const watchdog = setTimeout(() => {
  console.log(`\nWATCHDOG: hung after "${lastLabel}"`);
  process.exit(2);
}, 25000);

let failures = 0;
function check(label, condition, detail) {
  lastLabel = label;
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}`);
  if (!condition) {
    failures++;
    if (detail !== undefined) console.log('        got:', JSON.stringify(detail).slice(0, 300));
  }
}

// 1. status
{
  const body = await (await fetch(`${base}/api/ollama/status`)).json();
  check('status reports ok', body.ok === true, body);
  check('status lists both models', body.models?.length === 2, body);
  check('status carries parameter size', body.models?.[0]?.parameterSize === '1.5B', body);
  check('status exposes num_ctx', typeof body.numCtx === 'number', body);
}

// 2. streaming happy path
{
  const res = await fetch(`${base}/api/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'qwen2.5-coder:1.5b', messages: [{ role: 'user', content: 'hi' }] }),
  });
  check('chat returns 200', res.status === 200, res.status);
  check('chat content-type is ndjson', (res.headers.get('content-type') || '').includes('ndjson'));

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  let assembled = '';
  let sawDone = false;
  let chunkCount = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunkCount++;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const l of lines) {
      if (!l.trim()) continue;
      const rec = JSON.parse(l);
      if (rec.message?.content) assembled += rec.message.content;
      if (rec.done) sawDone = true;
    }
  }
  check('stream reassembles full text', assembled === 'Here is a streamed reply.', assembled);
  check('stream delivers a done record', sawDone === true);
  check('stream arrives incrementally, not buffered', chunkCount > 1, `chunks=${chunkCount}`);
}

// 3. unknown model -> helpful 502 with a pull hint
{
  const res = await fetch(`${base}/api/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'missing-model', messages: [{ role: 'user', content: 'hi' }] }),
  });
  const body = await res.json();
  check('unknown model returns 502', res.status === 502, res.status);
  check('unknown model suggests ollama pull', /ollama pull missing-model/.test(body.error ?? ''), body);
}

// 4. validation
{
  const a = await fetch(`${base}/api/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
  });
  check('missing model rejected with 400', a.status === 400, a.status);

  const b = await fetch(`${base}/api/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'x', messages: [] }),
  });
  check('empty messages rejected with 400', b.status === 400, b.status);
}

// 5. ollama down -> graceful, non-throwing status
{
  // close() alone leaves keep-alive sockets in undici's pool, and a request
  // reusing one hangs instead of refusing. Destroy them too.
  fakeServer.close();
  fakeServer.closeAllConnections?.();
  await new Promise((r) => setTimeout(r, 300));
  const body = await (await fetch(`${base}/api/ollama/status`)).json();
  check('status degrades to ok:false when Ollama is down', body.ok === false, body);
  check('status explains how to start Ollama', /ollama serve/.test(body.error ?? ''), body);

  const chat = await fetch(`${base}/api/ollama/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'x', messages: [{ role: 'user', content: 'hi' }] }),
  });
  const chatBody = await chat.json();
  check('chat returns 502 when Ollama is down', chat.status === 502, chat.status);
  check('chat error names the fix', /ollama serve/.test(chatBody.error ?? ''), chatBody);
}

clearTimeout(watchdog);
console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
server.close();
server.closeAllConnections?.();
process.exit(failures === 0 ? 0 : 1);
