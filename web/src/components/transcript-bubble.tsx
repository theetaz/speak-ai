"use client";

import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GrammarError {
  original: string;
  corrected: string;
  explanation: string;
}

export interface PronunciationNote {
  word: string;
  issue: string;
  tip: string;
}

export interface VocabSuggestion {
  word: string;
  definition: string;
  example: string;
}

export interface TranscriptMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp_ms: number;
  isFinal?: boolean;
  grammarErrors?: GrammarError[];
  pronunciationNotes?: PronunciationNote[];
  vocabSuggestions?: VocabSuggestion[];
  audio_url?: string | null;
}

interface TranscriptBubbleProps {
  message: TranscriptMessage;
  grammarErrors?: GrammarError[];
  pronunciationNotes?: PronunciationNote[];
  vocabSuggestions?: VocabSuggestion[];
  showAnnotations?: boolean;
  onPlayAudio?: (timestampMs: number) => void;
  onPlayMessageAudio?: (url: string) => void;
}

export function TranscriptBubble({
  message,
  grammarErrors: propGrammar = [],
  pronunciationNotes: propPronunciation = [],
  vocabSuggestions: propVocab = [],
  showAnnotations = false,
  onPlayAudio,
  onPlayMessageAudio,
}: TranscriptBubbleProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const isUser = message.role === "user";

  // Don't render empty messages
  if (!message.content.trim()) return null;

  const allGrammar = [...(message.grammarErrors ?? []), ...propGrammar];
  const allPronunciation = [...(message.pronunciationNotes ?? []), ...propPronunciation];
  const allVocab = [...(message.vocabSuggestions ?? []), ...propVocab];

  const hasLiveFeedback =
    isUser &&
    ((message.grammarErrors?.length ?? 0) > 0 ||
      (message.pronunciationNotes?.length ?? 0) > 0 ||
      (message.vocabSuggestions?.length ?? 0) > 0);

  const shouldAnnotate = isUser && (showAnnotations || hasLiveFeedback);

  const matchingGrammar = shouldAnnotate
    ? allGrammar.filter((e) =>
        message.content.toLowerCase().includes(e.original.toLowerCase()),
      )
    : [];
  const matchingPronunciation = shouldAnnotate
    ? allPronunciation.filter((n) =>
        message.content.toLowerCase().includes(n.word.toLowerCase()),
      )
    : [];
  const matchingVocab = shouldAnnotate
    ? allVocab.filter((v) =>
        message.content.toLowerCase().includes(v.word.toLowerCase()),
      )
    : [];

  const totalAnnotations =
    matchingGrammar.length + matchingPronunciation.length + matchingVocab.length;

  function renderAnnotatedText() {
    if (totalAnnotations === 0) return message.content;

    const text = message.content;
    const spans: { start: number; end: number; type: string; key: string }[] = [];

    for (const e of matchingGrammar) {
      const idx = text.toLowerCase().indexOf(e.original.toLowerCase());
      if (idx !== -1) {
        spans.push({ start: idx, end: idx + e.original.length, type: "grammar", key: `g-${e.original}` });
      }
    }
    for (const n of matchingPronunciation) {
      const idx = text.toLowerCase().indexOf(n.word.toLowerCase());
      if (idx !== -1 && !spans.some((s) => s.start <= idx && s.end > idx)) {
        spans.push({ start: idx, end: idx + n.word.length, type: "pronunciation", key: `p-${n.word}` });
      }
    }
    for (const v of matchingVocab) {
      const idx = text.toLowerCase().indexOf(v.word.toLowerCase());
      if (idx !== -1 && !spans.some((s) => s.start <= idx && s.end > idx)) {
        spans.push({ start: idx, end: idx + v.word.length, type: "vocab", key: `v-${v.word}` });
      }
    }

    spans.sort((a, b) => a.start - b.start);

    const elements: React.ReactNode[] = [];
    let cursor = 0;

    for (const span of spans) {
      if (span.start > cursor) elements.push(text.slice(cursor, span.start));

      const word = text.slice(span.start, span.end);
      const active = expandedItem === span.key;

      // Use white-based underlines on blue user bubbles, colored on assistant/review
      elements.push(
        <button
          key={span.key}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedItem(active ? null : span.key);
          }}
          className={cn(
            "cursor-pointer font-semibold transition-all rounded-sm px-0.5 -mx-0.5",
            active && "ring-1 ring-offset-1",
            isUser
              ? cn(
                  // On blue user bubble - use white-toned highlights
                  span.type === "grammar" && "underline decoration-wavy decoration-red-300 bg-white/15",
                  span.type === "pronunciation" && "underline decoration-dotted decoration-yellow-300 bg-white/15",
                  span.type === "vocab" && "underline decoration-dashed decoration-emerald-300 bg-white/15",
                  active && "ring-white/50 ring-offset-primary",
                )
              : cn(
                  // On light assistant/review bubble
                  span.type === "grammar" && "underline decoration-wavy decoration-red-500 text-red-700 dark:text-red-400",
                  span.type === "pronunciation" && "underline decoration-dotted decoration-orange-500 text-orange-700 dark:text-orange-400",
                  span.type === "vocab" && "underline decoration-dashed decoration-emerald-500 text-emerald-700 dark:text-emerald-400",
                  active && "ring-foreground/20 ring-offset-muted",
                ),
          )}
        >
          {word}
        </button>,
      );
      cursor = span.end;
    }
    if (cursor < text.length) elements.push(text.slice(cursor));

    return elements;
  }

  function renderExpandedDetail() {
    if (!expandedItem) return null;

    if (expandedItem.startsWith("g-")) {
      const original = expandedItem.slice(2);
      const err = matchingGrammar.find((e) => e.original.toLowerCase() === original.toLowerCase());
      if (!err) return null;
      return (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 p-3 text-xs space-y-1.5 border border-red-200 dark:border-red-800 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-400">
            <span className="size-2 rounded-full bg-red-500" />
            Grammar Correction
          </div>
          <div>
            <span className="line-through text-muted-foreground">{err.original}</span>
            {" "}&rarr;{" "}
            <span className="font-medium text-foreground">{err.corrected}</span>
          </div>
          <div className="text-muted-foreground">{err.explanation}</div>
        </div>
      );
    }

    if (expandedItem.startsWith("p-")) {
      const word = expandedItem.slice(2);
      const note = matchingPronunciation.find((n) => n.word.toLowerCase() === word.toLowerCase());
      if (!note) return null;
      return (
        <div className="rounded-xl bg-orange-50 dark:bg-orange-950/40 p-3 text-xs space-y-1.5 border border-orange-200 dark:border-orange-800 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-orange-700 dark:text-orange-400">
            <span className="size-2 rounded-full bg-orange-500" />
            Pronunciation Tip
          </div>
          <div className="text-muted-foreground">Issue: {note.issue}</div>
          <div className="font-medium text-foreground">{note.tip}</div>
        </div>
      );
    }

    if (expandedItem.startsWith("v-")) {
      const word = expandedItem.slice(2);
      const vocab = matchingVocab.find((v) => v.word.toLowerCase() === word.toLowerCase());
      if (!vocab) return null;
      return (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3 text-xs space-y-1.5 border border-emerald-200 dark:border-emerald-800 shadow-sm">
          <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" />
            Vocabulary
          </div>
          <div className="font-medium text-foreground">{vocab.word}</div>
          <div className="text-muted-foreground">{vocab.definition}</div>
          <div className="italic text-muted-foreground">&ldquo;{vocab.example}&rdquo;</div>
        </div>
      );
    }

    return null;
  }

  const minutes = Math.floor(message.timestamp_ms / 60000);
  const seconds = Math.floor((message.timestamp_ms % 60000) / 1000);
  const timestamp = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex flex-col max-w-[85%] animate-fade-in",
        isUser ? "ml-auto items-end" : "mr-auto items-start",
      )}
    >
      {/* Message bubble */}
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md",
          !message.isFinal && "opacity-60",
        )}
      >
        {renderAnnotatedText()}
        {/* Annotation count badge */}
        {totalAnnotations > 0 && !expandedItem && (
          <span className="inline-flex items-center gap-0.5 ml-1.5 align-middle">
            <ChevronDown className="size-3 opacity-60" />
            <span
              className={cn(
                "text-[10px] font-bold",
                isUser ? "text-primary-foreground/70" : "text-muted-foreground",
              )}
            >
              {totalAnnotations}
            </span>
          </span>
        )}
      </div>

      {/* Expanded feedback detail - rendered OUTSIDE the bubble */}
      {expandedItem && (
        <div className={cn("w-full mt-1.5", isUser ? "pr-0 pl-4" : "pl-0 pr-4")}>
          {renderExpandedDetail()}
        </div>
      )}

      <span className="text-[10px] text-muted-foreground mt-1 px-1 flex items-center gap-1">
        {isUser ? "You" : "Alex"} &middot; {timestamp}
        {(onPlayMessageAudio && message.audio_url) ? (
          <button
            type="button"
            onClick={() => onPlayMessageAudio(message.audio_url!)}
            className="hover:text-foreground transition-colors"
          >
            <Play className="size-3 fill-current" />
          </button>
        ) : onPlayAudio ? (
          <button
            type="button"
            onClick={() => onPlayAudio(message.timestamp_ms)}
            className="hover:text-foreground transition-colors"
          >
            <Play className="size-3 fill-current" />
          </button>
        ) : null}
      </span>
    </div>
  );
}
