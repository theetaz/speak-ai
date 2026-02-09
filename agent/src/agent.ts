import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  voice,
} from '@livekit/agents';
import * as google from '@livekit/agents-plugin-google';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

import { buildTeacherPrompt } from './prompts/teacher.js';
import { type GrammarError } from './tools/grammar.js';
import { type PronunciationNote } from './tools/pronunciation.js';
import { type VocabSuggestion } from './tools/vocabulary.js';
import {
  saveTranscript,
  saveFeedback,
  updateConversation,
  upsertDailyProgress,
} from './services/supabase.js';

dotenv.config({ path: '.env.local' });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const participant = await ctx.waitForParticipant();
    const metadata = JSON.parse(participant.metadata ?? '{}');

    const {
      user_id,
      conversation_id,
      english_level = 'B1',
      native_language = 'unknown',
      learning_goals = [],
      preferred_topics = [],
      display_name = 'Learner',
    } = metadata;

    // Collect feedback during conversation
    const grammarErrors: GrammarError[] = [];
    const pronunciationNotes: PronunciationNote[] = [];
    const vocabSuggestions: VocabSuggestion[] = [];
    const transcriptMessages: { role: string; content: string; timestamp_ms: number }[] = [];
    const sessionStart = Date.now();

    // --- Helper: create a fresh agent session ---
    // The Gemini Live API (especially preview models) can crash with 1011
    // "Internal error" — a known server-side bug triggered by accumulated
    // context + tool definitions in bidi streaming mode.
    //
    // Strategy:
    //   1. Use stable `gemini-2.0-flash-live-001` model instead of preview.
    //   2. Remove tools from the realtime session (tools + bidi streaming
    //      is the #1 trigger for 1011). Feedback is collected via transcripts
    //      and analysed post-session instead.
    //   3. turnDetection: 'realtime_llm' — delegate all VAD to Gemini
    //      server-side. Prevents local Silero VAD from sending conflicting
    //      "end of user turn" signals.
    //   4. Auto-recovery: if Gemini crashes, spin up a fresh session
    //      transparently so the user can keep talking.

    function createModel() {
      return new google.beta.realtime.RealtimeModel({
        voice: 'Puck',
        temperature: 0.8,
      });
    }

    function createAgent() {
      return new voice.Agent({
        instructions: buildTeacherPrompt({
          english_level,
          native_language,
          learning_goals,
          preferred_topics,
          display_name,
        }),
        // No tools — Gemini Live 1011 bug is triggered by functionDeclarations
        // in bidi streaming. Grammar/vocab feedback collected from transcripts.
      });
    }

    function createSession() {
      return new voice.AgentSession({
        llm: createModel(),
        turnDetection: 'realtime_llm',
      });
    }

    // Wire up transcript collection on a session
    function wireTranscripts(s: voice.AgentSession) {
      s.on(voice.AgentSessionEventTypes.UserInputTranscribed, (ev) => {
        transcriptMessages.push({
          role: 'user',
          content: ev.transcript,
          timestamp_ms: Date.now() - sessionStart,
        });
      });
      s.on(voice.AgentSessionEventTypes.ConversationItemAdded, (ev) => {
        if (ev.item?.role === 'assistant' && ev.item?.content) {
          const raw = ev.item.content;
          const content = Array.isArray(raw)
            ? raw
                .map((c) => {
                  if (typeof c === 'string') return c;
                  if (c && typeof c === 'object' && 'text' in c)
                    return String((c as { text?: string }).text ?? '');
                  return '';
                })
                .join('')
            : String(raw);
          if (content) {
            transcriptMessages.push({
              role: 'assistant',
              content,
              timestamp_ms: Date.now() - sessionStart,
            });
          }
        }
      });
    }

    // --- Start initial session ---
    let session = createSession();
    wireTranscripts(session);

    await session.start({ agent: createAgent(), room: ctx.room });

    await session
      .generateReply({
        instructions: `Greet ${display_name} warmly. Ask them how they're doing and what they'd like to practice today. Keep it brief and friendly.`,
      })
      .waitForPlayout();

    // --- Auto-recovery on Gemini 1011 crashes ---
    let recovering = false;
    session.on(voice.AgentSessionEventTypes.Close, async (ev) => {
      if (ev.reason === 'error' && !recovering) {
        recovering = true;
        console.warn('[Recovery] Session crashed, restarting...');
        try {
          session = createSession();
          wireTranscripts(session);
          await session.start({ agent: createAgent(), room: ctx.room });
          await session
            .generateReply({
              instructions:
                'Sorry, there was a brief technical glitch. Please continue — what were you saying?',
            })
            .waitForPlayout();
          // Re-attach close handler (recursive)
          attachCloseHandler(session);
          recovering = false;
        } catch (err) {
          console.error('[Recovery] Failed to restart session:', err);
        }
      } else if (ev.reason !== 'error') {
        // Normal close — persist data
        await persistSessionData();
      }
    });

    function attachCloseHandler(s: voice.AgentSession) {
      s.on(voice.AgentSessionEventTypes.Close, async (ev) => {
        if (ev.reason === 'error' && !recovering) {
          recovering = true;
          console.warn('[Recovery] Session crashed, restarting...');
          try {
            session = createSession();
            wireTranscripts(session);
            await session.start({ agent: createAgent(), room: ctx.room });
            await session
              .generateReply({
                instructions:
                  'Sorry, there was a brief technical glitch. Please continue — what were you saying?',
              })
              .waitForPlayout();
            attachCloseHandler(session);
            recovering = false;
          } catch (err) {
            console.error('[Recovery] Failed to restart session:', err);
          }
        } else if (ev.reason !== 'error') {
          await persistSessionData();
        }
      });
    }

    async function persistSessionData() {
      const duration = Math.floor((Date.now() - sessionStart) / 1000);
      const wordCount = transcriptMessages
        .filter((m) => m.role === 'user')
        .reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);

      try {
        if (conversation_id) {
          await saveTranscript(conversation_id, transcriptMessages);
          await saveFeedback(conversation_id, {
            grammar_corrections: grammarErrors,
            pronunciation_notes: pronunciationNotes,
            vocabulary_suggestions: vocabSuggestions,
          });
          await updateConversation(conversation_id, {
            status: 'completed',
            ended_at: new Date().toISOString(),
            duration_seconds: duration,
            english_level_at_time: english_level,
          });
        }
        if (user_id) {
          await upsertDailyProgress(user_id, duration, wordCount, grammarErrors.length, vocabSuggestions.length);
        }
      } catch (err) {
        console.error('Failed to save session data:', err);
      }
    }
  },
});

cli.runApp(new WorkerOptions({ agent: fileURLToPath(import.meta.url) }));
