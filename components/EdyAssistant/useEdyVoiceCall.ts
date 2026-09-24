import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from "livekit-client";

export type VoiceCallStatus =
  | "idle"
  | "connecting"
  | "active"
  | "error";

/**
 * Drives the voice channel to Edy over LiveKit (see the Edy integration
 * doc, section 04). This app never calls Edy over HTTP for voice — it only
 * fetches a signed access token from /api/edy/voice-token and joins the
 * room directly with the LiveKit client SDK. Edy's own voice worker
 * auto-joins any room it sees a participant enter.
 */
export function useEdyVoiceCall() {
  const roomRef = useRef<Room | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<VoiceCallStatus>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const cleanup = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    if (audioElRef.current) {
      audioElRef.current.srcObject = null;
    }
    setSpeaking(false);
    setMuted(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStatus("connecting");

    try {
      const res = await fetch("/api/edy/voice-token", { method: "POST" });
      if (!res.ok) {
        throw new Error("No se pudo iniciar la llamada con Edy.");
      }
      const { url, token } = await res.json();

      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.Disconnected, () => {
        setStatus((prev) => (prev === "error" ? prev : "idle"));
      });

      room.on(
        RoomEvent.TrackSubscribed,
        (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
          if (track.kind !== Track.Kind.Audio) return;
          void participant;
          const el = track.attach();
          el.autoplay = true;
          audioElRef.current = el as HTMLAudioElement;
        },
      );

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setSpeaking(speakers.length > 0);
      });

      room.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (state === ConnectionState.Disconnected) {
          setStatus((prev) => (prev === "error" ? prev : "idle"));
        }
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setStatus("active");
    } catch (err) {
      cleanup();
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo iniciar la llamada con Edy.",
      );
      setStatus("error");
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    cleanup();
    setStatus("idle");
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !muted;
    room.localParticipant.setMicrophoneEnabled(!next);
    setMuted(next);
  }, [muted]);

  // Always hang up if the widget unmounts mid-call.
  useEffect(() => cleanup, [cleanup]);

  return { status, error, muted, speaking, start, stop, toggleMute };
}
