import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { liveKitConfig } from "@/lib/env";

/**
 * Issues a LiveKit access token so the browser can join a voice room with
 * Edy directly (see the Edy integration doc, section 04 — Edy's voice
 * worker auto-joins any room it sees a participant enter; there is no HTTP
 * call from this app to Edy for voice, only shared LiveKit credentials).
 *
 * One room per browser session: a fresh room name each time this endpoint
 * is called, so concurrent users never collide and a stale room can't be
 * rejoined after the tab closes.
 */
export async function POST() {
  const { url, apiKey, apiSecret } = liveKitConfig();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const identity = user?.id ?? `guest-${randomUUID()}`;
  const room = `edy-${randomUUID()}`;

  const token = new AccessToken(apiKey, apiSecret, {
    identity,
    ttl: "10m",
  });
  token.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });

  const jwt = await token.toJwt();

  return NextResponse.json({ url, token: jwt, room });
}
