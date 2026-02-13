"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Pause, Play } from "lucide-react";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TranscriptBubble,
  type TranscriptMessage,
  type GrammarError,
  type PronunciationNote,
  type VocabSuggestion,
} from "@/components/transcript-bubble";
import { cn } from "@/lib/utils";

interface Feedback {
  grammar_corrections?: GrammarError[];
  pronunciation_notes?: PronunciationNote[];
  vocabulary_suggestions?: VocabSuggestion[];
  overall_feedback?: string;
  fluency_score?: number;
  grammar_score?: number;
  vocabulary_score?: number;
  pronunciation_score?: number;
  overall_score?: number;
  ai_analysis?: string;
}

interface ConversationReviewProps {
  conversationId: string;
  conversation: {
    started_at: string;
    duration_seconds?: number;
    topic?: string;
  };
  messages: TranscriptMessage[];
  feedback: Feedback | null;
  audioUrl?: string | null;
}

function ScoreRing({
  score,
  label,
  color,
}: {
  score: number;
  label: string;
  color: string;
}) {
  const pct = (score / 10) * 100;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative size-20">
        <svg className="size-20 -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/40"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
          {score}
        </span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

export function ConversationReview({
  conversationId,
  conversation,
  messages,
  feedback: initialFeedback,
  audioUrl,
}: ConversationReviewProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(initialFeedback);
  const [analyzing, setAnalyzing] = useState(false);
  const supabase = useSupabaseClient();

  // Audio player state
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  useEffect(() => {
    if (!audioUrl) return;
    const el = new Audio(audioUrl);
    el.preload = "metadata";
    el.onloadedmetadata = () => setAudioDuration(el.duration);
    el.ontimeupdate = () => setAudioProgress(el.currentTime);
    el.onended = () => setPlaying(false);
    audioElRef.current = el;
    return () => { el.pause(); el.src = ""; };
  }, [audioUrl]);

  const seekAndPlay = useCallback((timestampMs: number) => {
    const el = audioElRef.current;
    if (!el) return;
    el.currentTime = timestampMs / 1000;
    el.play();
    setPlaying(true);
  }, []);

  const messageAudioRef = useRef<HTMLAudioElement | null>(null);
  const playMessageAudio = useCallback((url: string) => {
    if (messageAudioRef.current) {
      messageAudioRef.current.pause();
      messageAudioRef.current.src = "";
    }
    const el = new Audio(url);
    messageAudioRef.current = el;
    el.play();
    el.onended = () => { messageAudioRef.current = null; };
  }, []);

  const togglePlayPause = useCallback(() => {
    const el = audioElRef.current;
    if (!el) return;
    if (el.paused) { el.play(); setPlaying(true); }
    else { el.pause(); setPlaying(false); }
  }, []);

  useEffect(() => {
    if (feedback?.ai_analysis || messages.length === 0) return;
    setAnalyzing(true);

    const channel = supabase
      .channel(`feedback-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversation_feedback",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as Record<string, unknown>;
          if (row?.ai_analysis) {
            setFeedback(row as Feedback);
            setAnalyzing(false);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, feedback?.ai_analysis, messages.length]);

  const grammarErrors = (feedback?.grammar_corrections ?? []) as GrammarError[];
  const pronunciationNotes = (feedback?.pronunciation_notes ?? []) as PronunciationNote[];
  const vocabSuggestions = (feedback?.vocabulary_suggestions ?? []) as VocabSuggestion[];

  const duration = conversation.duration_seconds ?? 0;
  const durationStr = `${Math.floor(duration / 60)}m ${duration % 60}s`;
  const dateStr = new Date(conversation.started_at).toLocaleDateString(
    undefined,
    { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" },
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/home">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Conversation Review</h1>
          <p className="text-sm text-muted-foreground">
            {dateStr} &middot; {durationStr}
          </p>
        </div>
      </div>

      {/* Scores */}
      {analyzing ? (
        <Card className="rounded-2xl border-2">
          <CardContent className="flex items-center justify-center gap-3 py-10">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span className="text-muted-foreground">Analyzing your conversation...</span>
          </CardContent>
        </Card>
      ) : feedback?.overall_score ? (
        <Card className="rounded-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle>Your Scores</CardTitle>
            <CardDescription>Performance breakdown for this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-center gap-6 py-2">
              <ScoreRing
                score={feedback.overall_score ?? 0}
                label="Overall"
                color="hsl(250 80% 60%)"
              />
              <ScoreRing
                score={feedback.grammar_score ?? 0}
                label="Grammar"
                color="hsl(0 80% 60%)"
              />
              <ScoreRing
                score={feedback.fluency_score ?? 0}
                label="Fluency"
                color="hsl(200 80% 55%)"
              />
              <ScoreRing
                score={feedback.vocabulary_score ?? 0}
                label="Vocabulary"
                color="hsl(150 70% 45%)"
              />
              <ScoreRing
                score={feedback.pronunciation_score ?? 0}
                label="Pronunciation"
                color="hsl(35 90% 55%)"
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* AI Analysis */}
      {feedback?.ai_analysis && (
        <Card className="rounded-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle>AI Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.overall_feedback && (
              <p className="font-medium text-sm">{feedback.overall_feedback}</p>
            )}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {feedback.ai_analysis}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Feedback Summary */}
      {(grammarErrors.length > 0 ||
        pronunciationNotes.length > 0 ||
        vocabSuggestions.length > 0) && (
        <Card className="rounded-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle>Session Highlights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {grammarErrors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-600 dark:text-red-400">
                  Grammar Corrections ({grammarErrors.length})
                </h4>
                {grammarErrors.map((e, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-red-50 dark:bg-red-950/20 p-3 text-xs space-y-0.5 border border-red-200 dark:border-red-900"
                  >
                    <div>
                      <span className="line-through text-muted-foreground">
                        {e.original}
                      </span>{" "}
                      &rarr; <span className="font-medium">{e.corrected}</span>
                    </div>
                    <div className="text-muted-foreground">{e.explanation}</div>
                  </div>
                ))}
              </div>
            )}
            {pronunciationNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  Pronunciation Tips ({pronunciationNotes.length})
                </h4>
                {pronunciationNotes.map((n, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-orange-50 dark:bg-orange-950/20 p-3 text-xs space-y-0.5 border border-orange-200 dark:border-orange-900"
                  >
                    <div className="font-medium">{n.word}</div>
                    <div className="text-muted-foreground">
                      {n.issue} &mdash; {n.tip}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {vocabSuggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  New Vocabulary ({vocabSuggestions.length})
                </h4>
                {vocabSuggestions.map((v, i) => (
                  <div
                    key={i}
                    className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-3 text-xs space-y-0.5 border border-emerald-200 dark:border-emerald-900"
                  >
                    <div className="font-medium">{v.word}</div>
                    <div className="text-muted-foreground">{v.definition}</div>
                    <div className="italic">&ldquo;{v.example}&rdquo;</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Full Transcript */}
      {messages.length > 0 && (
        <Card className="rounded-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle>Full Transcript</CardTitle>
            <CardDescription>
              Click highlighted words to see corrections and tips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {messages.map((msg, i) => (
              <TranscriptBubble
                key={i}
                message={msg}
                grammarErrors={grammarErrors}
                pronunciationNotes={pronunciationNotes}
                vocabSuggestions={vocabSuggestions}
                showAnnotations
                onPlayAudio={audioUrl ? seekAndPlay : undefined}
                onPlayMessageAudio={playMessageAudio}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audio Mini Player */}
      {audioUrl && audioDuration > 0 && (
        <div className="sticky bottom-4 z-10">
          <Card className="rounded-2xl border-2 shadow-lg">
            <CardContent className="flex items-center gap-3 py-3 px-4">
              <button
                type="button"
                onClick={togglePlayPause}
                className="shrink-0 size-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
              </button>
              <div className="flex-1 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${audioDuration ? (audioProgress / audioDuration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">
                  {Math.floor(audioProgress / 60)}:{Math.floor(audioProgress % 60).toString().padStart(2, "0")}
                  {" / "}
                  {Math.floor(audioDuration / 60)}:{Math.floor(audioDuration % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Button
          asChild
          size="lg"
          className={cn(
            "flex-1 rounded-full h-12 font-bold text-base shadow-lg",
            "hover:scale-[1.02] active:scale-[0.98] transition-transform",
          )}
        >
          <Link href="/conversation">Start New Conversation</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex-1 rounded-full h-12 font-bold text-base"
        >
          <Link href="/home">Back to Home</Link>
        </Button>
      </div>
    </div>
  );
}
