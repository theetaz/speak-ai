import {
  type JobContext,
  ServerOptions,
  cli,
  defineAgent,
  voice
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { buildTeacherPrompt } from "./prompts/teacher.js";
import { createGrammarTool, type GrammarError } from "./tools/grammar.js";
import { createPronunciationTool, type PronunciationNote } from "./tools/pronunciation.js";
import { createVocabularyTool, type VocabSuggestion } from "./tools/vocabulary.js";
import {
  saveTranscript,
  saveFeedback,
  updateConversation,
  upsertDailyProgress
} from "./services/supabase.js";
import { analyzeConversation } from "./services/analysis.js";

dotenv.config({ path: ".env.local" });

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Agent] Unhandled rejection:", reason);
});

export default defineAgent({
  entry: async (ctx: JobContext) => {
    const roomName = ctx.room.name;
    console.log(`[Agent] Joining room: ${roomName}`);

    try {
      await ctx.connect();
      console.log(`[Agent] Connected to room: ${roomName}`);
    } catch (err) {
      console.error(`[Agent] Failed to connect to room ${roomName}:`, err);
      throw err;
    }

    const participant = await ctx.waitForParticipant();
    console.log(`[Agent] Participant joined: ${participant.identity}`);
    const metadata = JSON.parse(participant.metadata ?? "{}");

    const {
      user_id,
      conversation_id,
      english_level = "B1",
      native_language = "unknown",
      learning_goals = [],
      preferred_topics = [],
      display_name = "Learner"
    } = metadata;

    // Collect feedback during conversation
    const grammarErrors: GrammarError[] = [];
    const pronunciationNotes: PronunciationNote[] = [];
    const vocabSuggestions: VocabSuggestion[] = [];
    const transcriptMessages: {
      role: string;
      content: string;
      timestamp_ms: number;
    }[] = [];
    const sessionStart = Date.now();

    // Publish real-time feedback to the client via text stream
    const publishFeedback = async (
      type: "grammar" | "pronunciation" | "vocabulary",
      data: GrammarError | PronunciationNote | VocabSuggestion
    ) => {
      try {
        const payload = JSON.stringify({ type, data, timestamp_ms: Date.now() - sessionStart });
        await ctx.room.localParticipant?.sendText(payload, { topic: "lk.feedback" });
      } catch (err) {
        console.warn("[Agent] Failed to publish feedback:", err);
      }
    };

    function createModel() {
      return new openai.realtime.RealtimeModel({
        model: "gpt-realtime-mini",
        voice: "marin",
        temperature: 0.3,
        inputAudioTranscription: {
          model: "whisper-1",
          language: "en",
        },
        turnDetection: {
          type: "server_vad",
          threshold: 0.5,
          silence_duration_ms: 600,
          prefix_padding_ms: 300,
          create_response: true
        }
      });
    }

    function createAgent() {
      return new voice.Agent({
        instructions: buildTeacherPrompt({
          english_level,
          native_language,
          learning_goals,
          preferred_topics,
          display_name
        }),
        tools: {
          flag_grammar_error: createGrammarTool(grammarErrors, (d) => publishFeedback("grammar", d)),
          flag_pronunciation: createPronunciationTool(pronunciationNotes, (d) => publishFeedback("pronunciation", d)),
          suggest_vocabulary: createVocabularyTool(vocabSuggestions, (d) => publishFeedback("vocabulary", d)),
        }
      });
    }

    function createSession() {
      return new voice.AgentSession({
        llm: createModel(),
        turnDetection: "realtime_llm"
      });
    }

    // Wire up transcript collection on a session
    function wireTranscripts(s: voice.AgentSession) {
      s.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
        transcriptMessages.push({
          role: "user",
          content: ev.transcript,
          timestamp_ms: Date.now() - sessionStart
        });
      });
      s.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
        if (ev.item?.role === "assistant" && ev.item?.content) {
          const raw = ev.item.content;
          const content = Array.isArray(raw)
            ? raw
                .map((c) => {
                  if (typeof c === "string") return c;
                  if (c && typeof c === "object" && "text" in c)
                    return String((c as { text?: string }).text ?? "");
                  return "";
                })
                .join("")
            : String(raw);
          if (content) {
            transcriptMessages.push({
              role: "assistant",
              content,
              timestamp_ms: Date.now() - sessionStart
            });
          }
        }
      });
    }

    // --- Start initial session ---
    let session = createSession();
    wireTranscripts(session);

    await session.start({
      agent: createAgent(),
      room: ctx.room,
      // Disable sync transcription so text arrives immediately (not word-by-word with audio)
      outputOptions: { syncTranscription: false }
    });

    await session
      .generateReply({
        instructions: `Greet ${display_name} warmly. Ask them how they're doing and what they'd like to practice today. Keep it brief and friendly.`
      })
      .waitForPlayout();

    // --- 2-minute session timeout ---
    const SESSION_DURATION_MS = 2 * 60 * 1000;
    const sessionTimer = setTimeout(async () => {
      try {
        await session
          .generateReply({
            instructions:
              "Our practice time is up! Give a brief, warm closing. Summarize one thing the student did well and one area to keep working on. Say goodbye encouragingly."
          })
          .waitForPlayout();
        await session.close();
      } catch {
        console.warn("[Timer] Failed to close session gracefully");
      }
    }, SESSION_DURATION_MS);

    // --- Auto-recovery on session errors ---
    let recovering = false;
    session.on(voice.AgentSessionEventTypes.Close, async (ev) => {
      if (ev.reason === "error" && !recovering) {
        recovering = true;
        console.warn("[Recovery] Session crashed, restarting...");
        try {
          session = createSession();
          wireTranscripts(session);
          await session.start({
            agent: createAgent(),
            room: ctx.room,
            outputOptions: { syncTranscription: false }
          });
          await session
            .generateReply({
              instructions:
                "Sorry, there was a brief technical glitch. Please continue — what were you saying?"
            })
            .waitForPlayout();
          attachCloseHandler(session);
          recovering = false;
        } catch (err) {
          console.error("[Recovery] Failed to restart session:", err);
        }
      } else if (ev.reason !== "error") {
        await persistSessionData();
      }
    });

    function attachCloseHandler(s: voice.AgentSession) {
      s.on(voice.AgentSessionEventTypes.Close, async (ev) => {
        if (ev.reason === "error" && !recovering) {
          recovering = true;
          console.warn("[Recovery] Session crashed, restarting...");
          try {
            session = createSession();
            wireTranscripts(session);
            await session.start({
              agent: createAgent(),
              room: ctx.room,
              outputOptions: { syncTranscription: false }
            });
            await session
              .generateReply({
                instructions:
                  "Sorry, there was a brief technical glitch. Please continue — what were you saying?"
              })
              .waitForPlayout();
            attachCloseHandler(session);
            recovering = false;
          } catch (err) {
            console.error("[Recovery] Failed to restart session:", err);
          }
        } else if (ev.reason !== "error") {
          await persistSessionData();
        }
      });
    }

    async function persistSessionData() {
      clearTimeout(sessionTimer);
      const duration = Math.floor((Date.now() - sessionStart) / 1000);
      const wordCount = transcriptMessages
        .filter((m) => m.role === "user")
        .reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);

      try {
        if (conversation_id) {
          await saveTranscript(conversation_id, transcriptMessages);

          const analysis = await analyzeConversation({
            transcript: transcriptMessages,
            grammarErrors,
            pronunciationNotes,
            vocabSuggestions,
            english_level,
            native_language
          });

          await saveFeedback(conversation_id, {
            grammar_corrections: grammarErrors,
            pronunciation_notes: pronunciationNotes,
            vocabulary_suggestions: vocabSuggestions,
            overall_feedback: analysis.overall_feedback,
            fluency_score: analysis.fluency_score,
            grammar_score: analysis.grammar_score,
            vocabulary_score: analysis.vocabulary_score,
            pronunciation_score: analysis.pronunciation_score,
            overall_score: analysis.overall_score,
            ai_analysis: analysis.ai_analysis
          });
          await updateConversation(conversation_id, {
            status: "completed",
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            english_level_at_time: english_level
          });
        }
        if (user_id) {
          await upsertDailyProgress(
            user_id,
            duration,
            wordCount,
            grammarErrors.length,
            vocabSuggestions.length
          );
        }
      } catch (err) {
        console.error("Failed to save session data:", err);
      }
    }
  }
});

const AGENT_NAME = "speakeasy-agent";
cli.runApp(
  new ServerOptions({
    agent: fileURLToPath(import.meta.url),
    agentName: AGENT_NAME
  })
);
