import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Square, RefreshCw, Copy, Check, Bot } from 'lucide-react';
import { getStatus, streamChat, formatSize } from '@/lib/ollama';
import type { OllamaModel, OllamaStatus, ChatMessage } from '@/lib/ollama';

/**
 * Chat against a model running locally on this device.
 *
 * This replaces the old scripted REPL, which matched keywords against canned
 * strings. Everything here is a real request to a real model — which also means
 * real latency, so the streaming and the Stop button carry a lot of the weight.
 */

interface DisplayMessage extends ChatMessage {
  id: string;
  streaming?: boolean;
  failed?: boolean;
}

let idCounter = 0;
const nextId = () => `m${Date.now()}-${idCounter++}`;

/** Splits assistant text into prose and fenced code so code renders as code. */
function segment(text: string): Array<{ code: boolean; lang?: string; body: string }> {
  const parts: Array<{ code: boolean; lang?: string; body: string }> = [];
  const fence = /```(\w+)?\n?([\s\S]*?)(?:```|$)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ code: false, body: text.slice(last, match.index) });
    }
    parts.push({ code: true, lang: match[1], body: match[2] });
    last = fence.lastIndex;
  }
  if (last < text.length) parts.push({ code: false, body: text.slice(last) });
  return parts.filter((p) => p.body.length > 0);
}

function CodeBlock({ lang, body }: { lang?: string; body: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the text is selectable either way */
    }
  };

  return (
    <div style={{ margin: '6px 0', border: '1px solid #3e3e42', borderRadius: 3, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#252526',
          padding: '2px 6px',
          fontSize: 10,
          color: '#858585',
        }}
      >
        <span>{lang || 'code'}</span>
        <button
          onClick={copy}
          title="Copy code"
          style={{ background: 'transparent', border: 'none', color: '#858585', cursor: 'pointer', padding: 2, display: 'flex' }}
        >
          {copied ? <Check size={12} color="#89d185" /> : <Copy size={12} />}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 8,
          background: '#1e1e1e',
          color: '#ce9178',
          fontSize: 12,
          fontFamily: 'monospace',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {body}
      </pre>
    </div>
  );
}

export function AiChat() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [model, setModel] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const cancelRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const applyStatus = useCallback((status: OllamaStatus) => {
    setChecking(false);

    if (!status.ok) {
      setStatusError(status.error ?? 'Ollama is not reachable.');
      setModels([]);
      return;
    }
    if (status.models.length === 0) {
      setStatusError(
        'Ollama is running but has no models. Pull a small one: ollama pull qwen2.5-coder:1.5b'
      );
      setModels([]);
      return;
    }

    setStatusError(null);
    setModels(status.models);
    setModel((current) =>
      current && status.models.some((m) => m.name === current) ? current : status.models[0].name
    );
  }, []);

  const refresh = useCallback(async () => {
    setChecking(true);
    applyStatus(await getStatus());
  }, [applyStatus]);

  // Deliberately not calling refresh() here: setting state synchronously in an
  // effect body causes a cascading render. The await is the boundary.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const status = await getStatus();
      if (!cancelled) applyStatus(status);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyStatus]);

  // Stop generation if this panel unmounts, so a closed tab doesn't leave the
  // model burning CPU in the background.
  useEffect(() => () => cancelRef.current?.(), []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const stop = () => {
    cancelRef.current?.();
    cancelRef.current = null;
    setBusy(false);
    setMessages((prev) => prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)));
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy || !model) return;

    const userMessage: DisplayMessage = { id: nextId(), role: 'user', content: text };
    const replyId = nextId();
    const reply: DisplayMessage = { id: replyId, role: 'assistant', content: '', streaming: true };

    const history = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage, reply]);
    setInput('');
    setBusy(true);

    cancelRef.current = streamChat(model, history, {
      onToken: (chunk) =>
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m))
        ),
      onDone: () => {
        setMessages((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, streaming: false } : m))
        );
        setBusy(false);
        cancelRef.current = null;
      },
      onError: (message) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === replyId ? { ...m, content: message, streaming: false, failed: true } : m
          )
        );
        setBusy(false);
        cancelRef.current = null;
      },
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter breaks the line. On a phone keyboard the newline
    // is the rarer intent, so it gets the modifier.
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const active = models.find((m) => m.name === model);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e', minHeight: 0 }}>
      {/* Model bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderBottom: '1px solid #3e3e42',
          background: '#252526',
          fontSize: 11,
          color: '#858585',
          flexWrap: 'wrap',
        }}
      >
        <Bot size={13} color="#d4a5ff" />
        {models.length > 0 ? (
          <>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={busy}
              style={{
                background: '#3c3c3c',
                color: '#cccccc',
                border: '1px solid #3e3e42',
                borderRadius: 3,
                fontSize: 11,
                padding: '2px 4px',
                maxWidth: 200,
              }}
            >
              {models.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
            {active && (
              <span>
                {[active.parameterSize, active.quantization, formatSize(active.size)]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            )}
          </>
        ) : (
          <span>{checking ? 'Checking for Ollama…' : 'No model'}</span>
        )}

        <button
          onClick={() => void refresh()}
          title="Check again"
          disabled={checking}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: '#858585',
            cursor: checking ? 'default' : 'pointer',
            padding: 2,
            display: 'flex',
          }}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Transcript */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 10, minHeight: 0 }}>
        {statusError && (
          <div
            style={{
              border: '1px solid #5a1d1d',
              background: '#2d1a1a',
              color: '#f48771',
              padding: 10,
              borderRadius: 3,
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {statusError}
          </div>
        )}

        {!statusError && messages.length === 0 && (
          <div style={{ color: '#858585', fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ color: '#cccccc', marginBottom: 4 }}>
              Connected to {model || 'a local model'}.
            </div>
            Nothing leaves this device. Ask about the code you have open, or paste an error and
            ask what's causing it.
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 10,
                color: m.role === 'user' ? '#569cd6' : '#d4a5ff',
                marginBottom: 3,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              {m.role === 'user' ? 'You' : model || 'Model'}
            </div>

            {m.role === 'user' ? (
              <div style={{ color: '#cccccc', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {m.content}
              </div>
            ) : (
              <div style={{ color: m.failed ? '#f48771' : '#cccccc', fontSize: 13, lineHeight: 1.6 }}>
                {segment(m.content).map((part, i) =>
                  part.code ? (
                    <CodeBlock key={i} lang={part.lang} body={part.body} />
                  ) : (
                    <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
                      {part.body}
                    </span>
                  )
                )}
                {m.streaming && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7,
                      height: 14,
                      background: '#d4a5ff',
                      marginLeft: 2,
                      verticalAlign: 'text-bottom',
                      animation: 'ai-caret 1.06s step-end infinite',
                    }}
                  />
                )}
              </div>
            )}
          </div>
        ))}

        <style>{`@keyframes ai-caret{0%,100%{opacity:1}50%{opacity:0}}
@media (prefers-reduced-motion: reduce){[style*="ai-caret"]{animation:none!important}}`}</style>
      </div>

      {/* Composer */}
      <div
        style={{
          borderTop: '1px solid #3e3e42',
          padding: 8,
          display: 'flex',
          gap: 6,
          alignItems: 'flex-end',
          background: '#252526',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={statusError ? 'Start Ollama to begin' : 'Ask about your code…'}
          disabled={!!statusError || !model}
          style={{
            flex: 1,
            background: '#3c3c3c',
            color: '#cccccc',
            border: '1px solid #3e3e42',
            borderRadius: 3,
            padding: '6px 8px',
            fontSize: 13,
            fontFamily: 'inherit',
            resize: 'none',
            maxHeight: 120,
            outline: 'none',
          }}
        />

        {busy ? (
          <button
            onClick={stop}
            title="Stop generating"
            style={{
              background: '#5a1d1d',
              border: 'none',
              color: '#f48771',
              borderRadius: 3,
              padding: '7px 10px',
              cursor: 'pointer',
              display: 'flex',
            }}
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={send}
            title="Send"
            disabled={!input.trim() || !!statusError || !model}
            style={{
              background: input.trim() && !statusError && model ? '#007acc' : '#3c3c3c',
              border: 'none',
              color: input.trim() && !statusError && model ? '#ffffff' : '#858585',
              borderRadius: 3,
              padding: '7px 10px',
              cursor: input.trim() && !statusError && model ? 'pointer' : 'default',
              display: 'flex',
            }}
          >
            <Send size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default AiChat;
