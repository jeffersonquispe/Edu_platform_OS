import { NextResponse } from "next/server";
import { edyServiceUrl } from "@/lib/env";

/**
 * Server-side proxy to the Edy assistant microservice's POST /chat.
 *
 * Edy has no authentication of its own (internal-network contract) and no
 * CORS story for the browser, so the client must never call it directly.
 * This Route Handler is the only thing allowed to know EDY_SERVICE_URL.
 *
 * Contract with Edy (see the Edy integration doc):
 * - Request:  { message: string }
 * - Response: { reply: string } — always 200 from Edy, even when its
 *   internal tool-use loop gives up; callers must treat `reply` content,
 *   not the HTTP status, as the source of truth for success.
 * - No conversation history is kept by Edy — each call is a fresh turn.
 * - Edy times out its own catalog lookups at 6s, but a turn that triggers
 *   the search_courses tool also pays for an LLM round-trip on top of that
 *   (observed ~9-11s end to end), so our own budget here must clear that
 *   comfortably rather than race it.
 */
export async function POST(request: Request) {
  let message: unknown;
  try {
    const body = await request.json();
    message = body?.message;
  } catch {
    return NextResponse.json(
      { error: "Cuerpo de la solicitud inválido." },
      { status: 400 },
    );
  }

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "El mensaje es requerido." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const edyUrl = new URL("/chat", edyServiceUrl());
    const response = await fetch(edyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: message.trim() }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "El asistente no está disponible en este momento." },
        { status: 502 },
      );
    }

    const data = await response.json();
    const reply =
      typeof data?.reply === "string"
        ? data.reply
        : "No pude completar la respuesta.";

    return NextResponse.json({ reply });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: timedOut
          ? "El asistente tardó demasiado en responder."
          : "No se pudo contactar al asistente.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
