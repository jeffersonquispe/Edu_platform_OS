"use client";

import { useRef, useState, type FormEvent } from "react";
import "./edy-assistant.css";
import { useEdyVoiceCall } from "./useEdyVoiceCall";

type ChatMessage = {
  id: string;
  role: "user" | "edy";
  text: string;
};

const SUGGESTIONS = [
  "¿Qué cursos de este tema tienen disponibles?",
  "¿Cómo me inscribo en un curso?",
  "No encuentro dónde ver mis lecciones",
];

const CALL_BARS = [0, 1, 2, 3, 4];

/**
 * Floating conversational assistant. Two channels, matching the Edy
 * integration contract:
 * - Text: POST via /api/edy/chat (server-side proxy — the browser never
 *   calls the Edy microservice directly).
 * - Voice: LiveKit. The browser joins the room directly with a token from
 *   /api/edy/voice-token; there is no HTTP call to Edy for voice at all.
 * The "Llamada" toggle swaps the whole panel between the two modes.
 */
export function EdyAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const voice = useEdyVoiceCall();
  const callActive = voice.status !== "idle";

  const hasStarted = messages.length > 0;

  function scrollToBottom() {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    });
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: trimmed },
    ]);
    setInput("");
    setSending(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/edy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo contactar al asistente.");
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "edy", text: data.reply },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo contactar al asistente.",
      );
    } finally {
      setSending(false);
      scrollToBottom();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleToggleCall() {
    if (callActive) {
      voice.stop();
    } else {
      voice.start();
    }
  }

  return (
    <div className="edy-widget">
      {open && (
        <div
          className="edy-panel"
          role="dialog"
          aria-label="Asistente Edy"
          aria-modal="false"
        >
          <div className="edy-panel-header">
            <div className="edy-panel-identity">
              <div className="edy-avatar" aria-hidden="true">
                ✦
              </div>
              <div>
                <div className="edy-panel-title">Edy</div>
                <div className="edy-panel-subtitle">
                  {callActive ? "En llamada" : "Asistente del curso"}
                </div>
              </div>
            </div>
            <div className="edy-header-actions">
              <label className="edy-call-toggle">
                <span>Llamada</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={callActive}
                  aria-label={
                    callActive ? "Terminar llamada de voz" : "Iniciar llamada de voz"
                  }
                  className={`edy-switch ${callActive ? "edy-switch-on" : ""}`}
                  onClick={handleToggleCall}
                  disabled={voice.status === "connecting"}
                >
                  <span className="edy-switch-knob" />
                </button>
              </label>
              <button
                type="button"
                className="edy-icon-btn"
                title="Cerrar"
                aria-label="Cerrar asistente"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {callActive ? (
            <div className="edy-call">
              <div className="edy-call-orb-wrap">
                <div className="edy-call-ring" />
                <div className="edy-call-ring edy-call-ring-delay" />
                <div className="edy-avatar edy-avatar-lg edy-call-orb" aria-hidden="true">
                  ✦
                </div>
              </div>
              <div className="edy-call-status">
                {voice.status === "connecting"
                  ? "Conectando con Edy…"
                  : "En llamada con Edy"}
              </div>
              <div
                className={`edy-call-bars ${voice.speaking ? "edy-call-bars-active" : ""}`}
                aria-hidden="true"
              >
                {CALL_BARS.map((i) => (
                  <span
                    key={i}
                    className="edy-call-bar"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
              {voice.error && <div className="edy-error">{voice.error}</div>}
              <div className="edy-call-controls">
                <button
                  type="button"
                  className={`edy-call-btn ${voice.muted ? "edy-call-btn-muted" : ""}`}
                  onClick={voice.toggleMute}
                  disabled={voice.status !== "active"}
                  aria-pressed={voice.muted}
                  aria-label={voice.muted ? "Activar micrófono" : "Silenciar micrófono"}
                  title={voice.muted ? "Activar micrófono" : "Silenciar micrófono"}
                >
                  {voice.muted ? "🔇" : "🎙️"}
                </button>
                <button
                  type="button"
                  className="edy-call-btn edy-call-btn-hangup"
                  onClick={voice.stop}
                  aria-label="Colgar"
                  title="Colgar"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <>
              {!hasStarted ? (
                <div className="edy-welcome">
                  <div className="edy-avatar edy-avatar-lg" aria-hidden="true">
                    ✦
                  </div>
                  <div className="edy-welcome-title">Hola, soy Edy</div>
                  <p className="edy-welcome-text">
                    Puedo ayudarte a encontrar cursos y resolver dudas sobre la
                    plataforma. Pregúntame lo que necesites, o llámame si
                    prefieres hablarlo.
                  </p>
                  <div className="edy-suggestions">
                    {SUGGESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className="edy-suggestion"
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="edy-messages" ref={listRef}>
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`edy-message edy-message-${m.role}`}
                    >
                      {m.text}
                    </div>
                  ))}
                  {sending && (
                    <div className="edy-message edy-message-edy edy-message-pending">
                      <span className="edy-dot" />
                      <span className="edy-dot" />
                      <span className="edy-dot" />
                    </div>
                  )}
                </div>
              )}

              {error && <div className="edy-error">{error}</div>}

              <form className="edy-input-row" onSubmit={handleSubmit}>
                <input
                  type="text"
                  className="edy-input"
                  placeholder="Escribe tu pregunta…"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                  aria-label="Mensaje para Edy"
                />
                <button
                  type="submit"
                  className="edy-send-btn"
                  disabled={sending || input.trim() === ""}
                  aria-label="Enviar"
                >
                  ➤
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="edy-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar asistente Edy" : "Abrir asistente Edy"}
        data-testid="edy-launcher"
      >
        {open ? "✕" : "✦"}
      </button>
    </div>
  );
}
