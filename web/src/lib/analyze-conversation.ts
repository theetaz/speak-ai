import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const openai = new OpenAI();

export interface AnalyzeInput {
  conversationId: string;
  messages: { role: string; content: string; timestamp_ms: number }[];
  grammarCorrections: unknown[];
  pronunciationNotes: unknown[];
  vocabularySuggestions: unknown[];
}

export async function runConversationAnalysis(
  input: AnalyzeInput,
): Promise<{ updated: boolean; error?: string }> {
  const {
    conversationId,
    messages,
    grammarCorrections,
    pronunciationNotes,
    vocabularySuggestions,
  } = input;

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.content}`)
    .join("\n");

  const prompt = `You are an expert English language assessor. Analyze this conversation between a teacher and a student.

CONVERSATION:
${conversationText}

GRAMMAR ERRORS DETECTED:
${grammarCorrections.length ? JSON.stringify(grammarCorrections, null, 2) : "None detected"}

PRONUNCIATION CONCERNS:
${pronunciationNotes.length ? JSON.stringify(pronunciationNotes, null, 2) : "None detected"}

VOCABULARY TAUGHT:
${vocabularySuggestions.length ? JSON.stringify(vocabularySuggestions, null, 2) : "None"}

Respond ONLY with valid JSON matching this exact schema:
{
  "fluency_score": <1-10>,
  "grammar_score": <1-10>,
  "vocabulary_score": <1-10>,
  "pronunciation_score": <1-10>,
  "overall_score": <1-10>,
  "overall_feedback": "<2-3 sentence summary>",
  "ai_analysis": "<detailed paragraph: strengths, weaknesses, specific improvements, encouragement>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(text);

    const clamp = (n: number) => Math.max(1, Math.min(10, Math.round(n || 5)));

    const updates = {
      fluency_score: clamp(analysis.fluency_score),
      grammar_score: clamp(analysis.grammar_score),
      vocabulary_score: clamp(analysis.vocabulary_score),
      pronunciation_score: clamp(analysis.pronunciation_score),
      overall_score: clamp(analysis.overall_score),
      overall_feedback: analysis.overall_feedback ?? "Session completed.",
      ai_analysis: analysis.ai_analysis ?? "",
    };

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { data: existing } = await admin
      .from("conversation_feedback")
      .select("id")
      .eq("conversation_id", conversationId)
      .single();

    if (existing) {
      await admin
        .from("conversation_feedback")
        .update(updates)
        .eq("id", existing.id);
    } else {
      await admin.from("conversation_feedback").insert({
        conversation_id: conversationId,
        grammar_corrections: grammarCorrections,
        pronunciation_notes: pronunciationNotes,
        vocabulary_suggestions: vocabularySuggestions,
        ...updates,
      });
    }

    return { updated: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Analysis failed";
    return { updated: false, error: msg };
  }
}
