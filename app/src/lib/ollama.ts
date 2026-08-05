/**
 * Client for a local Ollama model, proxied through our own backend.
 *
 * Going through the backend rather than hitting Ollama directly from the
 * browser buys two things: no CORS configuration (Ollama restricts origins by
 * default), and it keeps working when you open the editor from a laptop on the
 * same network — `127.0.0.1` in a browser means *that browser's* machine, which
 * is the wrong machine.
 */

import { getServerUrl } from '@/lib/api';

export interface OllamaModel {
  name: string;
  size: number | null;
  family: string | null;
  parameterSize: string | null;
  quantization: string | null;
}

export interface OllamaStatus {
  ok: boolean;
  url: string;
  numCtx?: number;
  models: OllamaModel[];
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Human-readable model size, e.g. "2.4 GB". */
export function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

export async function getStatus(): Promise<OllamaStatus> {
  try {
    const res = await fetch(`${getServerUrl()}/api/ollama/status`);
    if (!res.ok) {
      return { ok: false, url: '', models: [], error: `Backend returned ${res.status}.` };
    }
    return (await res.json()) as OllamaStatus;
  } catch {
    return {
      ok: false,
      url: '',
      models: [],
      error: 'Cannot reach the backend. Is it running? Try ./start.sh',
    };
  }
}

interface StreamHandlers {
  onToken: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Streams a reply, calling `onToken` for each fragment as it arrives.
 * Returns a function that cancels the request — which also aborts generation
 * on the server, so pressing Stop actually frees the CPU rather than just
 * hiding the output.
 */
export function streamChat(
  model: string,
  messages: ChatMessage[],
  handlers: StreamHandlers
): () => void {
  const controller = new AbortController();

  (async () => {
    let res: Response;
    try {
      res = await fetch(`${getServerUrl()}/api/ollama/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        handlers.onError('Cannot reach the backend. Is it running?');
      }
      return;
    }

    if (!res.ok) {
      let message = `Request failed (${res.status}).`;
      try {
        const body = await res.json();
        if (body?.error) message = body.error;
      } catch {
        /* keep the status-code message */
      }
      handlers.onError(message);
      return;
    }

    if (!res.body) {
      handlers.onError('The backend sent an empty response.');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // NDJSON: complete records are separated by newlines. Whatever follows
        // the last newline is a partial record — hold it for the next chunk.
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.trim()) continue;

          let record: { message?: { content?: string }; done?: boolean; error?: string };
          try {
            record = JSON.parse(line);
          } catch {
            continue; // A malformed record shouldn't kill the stream.
          }

          if (record.error) {
            handlers.onError(record.error);
            return;
          }
          if (record.message?.content) {
            handlers.onToken(record.message.content);
          }
        }
      }
      handlers.onDone();
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        handlers.onDone();
      } else {
        handlers.onError((err as Error)?.message ?? 'The stream ended unexpectedly.');
      }
    }
  })();

  return () => controller.abort();
}
