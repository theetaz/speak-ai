"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Room,
  RoomEvent,
  Track,
  ParticipantKind,
  type RemoteParticipant,
  type RemoteTrackPublication,
  type RemoteTrack,
} from "livekit-client";
import { Mic, MicOff, PhoneOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TranscriptBubble,
  type TranscriptMessage,
  type GrammarError,
  type PronunciationNote,
  type VocabSuggestion,
} from "@/components/transcript-bubble";
import { cn } from "@/lib/utils";

type SessionState =
  | "idle"
  | "connecting"
  | "waiting"
  | "active"
  | "ending"
  | "ended";

const SESSION_DURATION = 2 * 60;

export function ConversationRoom() {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [state, setState] = useState<SessionState>("idle");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(SESSION_DURATION);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [agentState, setAgentState] = useState<string>("initializing");
  const [error, setError] = useState<string | null>(null);

  const sessionStartRef = useRef<number>(0);
  // Segment-based message tracking for deduplication
  const segmentMapRef = useRef<Map<string, TranscriptMessage>>(new Map());

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      roomRef.current?.disconnect();
    };
  }, []);

  const flushMessages = useCallback(() => {
    setMessages(
      Array.from(segmentMapRef.current.values()).filter((m) => m.content.trim()),
    );
  }, []);

  const startSession = useCallback(async () => {
    setState("connecting");
    setError(null);
    segmentMapRef.current.clear();

    try {
      const res = await fetch("/api/conversation/start", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to start conversation");
      }

      const { conversationId: cId, token, wsUrl } = await res.json();
      setConversationId(cId);

      const room = new Room({
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        adaptiveStream: true,
      });
      roomRef.current = room;

      const isAgent = (p: { kind: ParticipantKind }) =>
        p.kind === ParticipantKind.AGENT;

      const activateSession = () => {
        if (sessionStartRef.current) return;
        setState("active");
        sessionStartRef.current = Date.now();
        setTimeLeft(SESSION_DURATION);
        timerRef.current = setInterval(() => {
          setTimeLeft((prev) => {
            if (prev <= 1) {
              endSession();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      };

      // Agent state tracking
      room.on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
        if (isAgent(participant)) {
          const s = participant.attributes?.["lk.agent.state"];
          if (s) setAgentState(s);
        }
      });

      // Agent audio
      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: RemoteTrack,
          _pub: RemoteTrackPublication,
          participant: RemoteParticipant,
        ) => {
          if (isAgent(participant) && track.kind === Track.Kind.Audio) {
            if (!audioRef.current) {
              audioRef.current = document.createElement("audio");
              audioRef.current.autoplay = true;
              document.body.appendChild(audioRef.current);
            }
            track.attach(audioRef.current);
          }
        },
      );

      // ── Transcription handler with segment-based deduplication ──
      room.registerTextStreamHandler(
        "lk.transcription",
        async (reader, participantInfo) => {
          const segmentId = reader.info.attributes?.["lk.segment_id"] ?? reader.info.id;
          const isFinal =
            reader.info.attributes?.["lk.transcription_final"] === "true";
          const isRemote =
            participantInfo.identity !== room.localParticipant.identity;
          const role: "user" | "assistant" = isRemote ? "assistant" : "user";

          // Read entire stream content
          const text = await reader.readAll();
          if (!text.trim()) return;

          const existing = segmentMapRef.current.get(segmentId);
          const msg: TranscriptMessage = {
            id: segmentId,
            role,
            content: text,
            timestamp_ms: existing?.timestamp_ms ?? (Date.now() - sessionStartRef.current),
            isFinal,
            // Preserve any feedback already attached
            grammarErrors: existing?.grammarErrors,
            pronunciationNotes: existing?.pronunciationNotes,
            vocabSuggestions: existing?.vocabSuggestions,
          };

          segmentMapRef.current.set(segmentId, msg);
          flushMessages();
        },
      );

      // ── Real-time feedback handler ──
      room.registerTextStreamHandler(
        "lk.feedback",
        async (reader) => {
          const raw = await reader.readAll();
          try {
            const payload = JSON.parse(raw) as {
              type: "grammar" | "pronunciation" | "vocabulary";
              data: GrammarError | PronunciationNote | VocabSuggestion;
            };

            // Find the most recent user message to attach this feedback to
            const allMsgs = Array.from(segmentMapRef.current.values());
            const userMsgs = allMsgs.filter((m) => m.role === "user");
            if (userMsgs.length === 0) return;

            // Try to match by content; fall back to most recent user message
            let target: TranscriptMessage | undefined;
            if (payload.type === "grammar") {
              const g = payload.data as GrammarError;
              target = [...userMsgs].reverse().find((m) =>
                m.content.toLowerCase().includes(g.original.toLowerCase()),
              );
            } else if (payload.type === "pronunciation") {
              const p = payload.data as PronunciationNote;
              target = [...userMsgs].reverse().find((m) =>
                m.content.toLowerCase().includes(p.word.toLowerCase()),
              );
            } else if (payload.type === "vocabulary") {
              const v = payload.data as VocabSuggestion;
              target = [...userMsgs].reverse().find((m) =>
                m.content.toLowerCase().includes(v.word.toLowerCase()),
              );
            }
            if (!target) target = userMsgs[userMsgs.length - 1];

            // Attach feedback to the target message
            const updated = segmentMapRef.current.get(target.id);
            if (!updated) return;

            if (payload.type === "grammar") {
              updated.grammarErrors = [
                ...(updated.grammarErrors ?? []),
                payload.data as GrammarError,
              ];
            } else if (payload.type === "pronunciation") {
              updated.pronunciationNotes = [
                ...(updated.pronunciationNotes ?? []),
                payload.data as PronunciationNote,
              ];
            } else if (payload.type === "vocabulary") {
              updated.vocabSuggestions = [
                ...(updated.vocabSuggestions ?? []),
                payload.data as VocabSuggestion,
              ];
            }

            segmentMapRef.current.set(target.id, updated);
            flushMessages();
          } catch {
            // ignore parse errors
          }
        },
      );

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        if (isAgent(participant)) activateSession();
      });

      room.on(RoomEvent.Disconnected, () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setState("ended");
      });

      setState("waiting");
      await room.connect(wsUrl, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      // Race condition: agent may already be in the room
      for (const p of room.remoteParticipants.values()) {
        if (isAgent(p)) {
          activateSession();
          break;
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      setError(msg);
      toast.error(msg);
      setState("idle");
    }
  }, [flushMessages]);

  const endSession = useCallback(async () => {
    if (state === "ending" || state === "ended") return;
    setState("ending");
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      await roomRef.current?.disconnect();
    } catch {
      // ignore
    }
    if (audioRef.current) {
      audioRef.current.remove();
      audioRef.current = null;
    }
    setState("ended");
  }, [state]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const newMuted = !muted;
    await room.localParticipant.setMicrophoneEnabled(!newMuted);
    setMuted(newMuted);
  }, [muted]);

  const goToReview = useCallback(() => {
    if (conversationId) {
      router.push(`/conversation/${conversationId}/review`);
    } else {
      router.push("/home");
    }
  }, [conversationId, router]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timerPercent = (timeLeft / SESSION_DURATION) * 100;

  // --- Idle ---
  if (state === "idle") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="text-6xl">🎤</div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Ready to Practice?</h2>
          <p className="text-muted-foreground max-w-sm">
            You&apos;ll have a 2-minute voice conversation with Alex, your AI
            English tutor. Speak naturally -- Alex will help with grammar,
            pronunciation, and vocabulary.
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="lg"
          onClick={startSession}
          className="rounded-full h-14 px-10 font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Start Conversation
        </Button>
      </div>
    );
  }

  // --- Connecting / Waiting ---
  if (state === "connecting" || state === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="size-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">
          {state === "connecting"
            ? "Setting up your session..."
            : "Waiting for Alex to join..."}
        </p>
      </div>
    );
  }

  // --- Ended ---
  if (state === "ended") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12">
        <div className="text-6xl">🎉</div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Great Practice!</h2>
          <p className="text-muted-foreground">
            Your conversation has ended. View your detailed feedback and scores.
          </p>
        </div>
        <Button
          size="lg"
          onClick={goToReview}
          className="rounded-full h-14 px-10 font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          View Review
        </Button>
      </div>
    );
  }

  // --- Active / Ending ---
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-3 rounded-full",
              agentState === "speaking"
                ? "bg-emerald-500 animate-pulse"
                : agentState === "thinking"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-primary",
            )}
          />
          <span className="text-sm font-medium capitalize">
            Alex is{" "}
            {agentState === "listening"
              ? "listening..."
              : `${agentState}...`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000",
                timerPercent > 30
                  ? "bg-primary"
                  : timerPercent > 10
                    ? "bg-amber-500"
                    : "bg-red-500",
              )}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
          <span
            className={cn(
              "text-sm font-mono font-bold tabular-nums",
              timeLeft <= 15 && "text-red-500",
            )}
          >
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      {/* Transcript */}
      <Card className="flex-1 overflow-hidden rounded-2xl border-2 mx-4">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 space-y-3"
        >
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Conversation will appear here...
            </p>
          )}
          {messages.map((msg) => (
            <TranscriptBubble key={msg.id} message={msg} />
          ))}
        </div>
      </Card>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 py-4">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className={cn(
            "rounded-full size-14 transition-all",
            muted && "bg-destructive/10 border-destructive text-destructive",
          )}
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={endSession}
          className="rounded-full size-14 shadow-lg"
          disabled={state === "ending"}
        >
          <PhoneOff className="size-5" />
        </Button>
      </div>
    </div>
  );
}
