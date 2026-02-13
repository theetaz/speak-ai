import OpenAI from "openai";
import type { GrammarError } from "../tools/grammar.js";
import type { PronunciationNote } from "../tools/pronunciation.js";
import type { VocabSuggestion } from "../tools/vocabulary.js";

let _openai: OpenAI | null = null;
function getClient() {
  if (!_openai) _openai = new OpenAI();
  return _openai;
}

interface AnalysisInput {
  transcript: { role: string; content: string; timestamp_ms: number }[];
  grammarErrors: GrammarError[];
  pronunciationNotes: PronunciationNote[];
  vocabSuggestions: VocabSuggestion[];
  english_level: string;
  native_language: string;
}

interface AnalysisResult {
  fluency_score: number;
  grammar_score: number;
  vocabulary_score: number;
  pronunciation_score: number;
  overall_score: number;
  overall_feedback: string;
  ai_analysis: string;
}

export async function analyzeConversation(
  input: AnalysisInput
): Promise<AnalysisResult> {
  const conversationText = input.transcript
    .map((m) => `${m.role === "user" ? "Student" : "Teacher"}: ${m.content}`)
    .join("\n");

  const prompt = `You are an expert English language assessor. Analyze this conversation between a teacher and a ${input.english_level}-level student (native language: ${input.native_language}).

CONVERSATION:
${conversationText}

GRAMMAR ERRORS DETECTED:
${input.grammarErrors.length ? input.grammarErrors.map((e) => `- "${e.original}" → "${e.corrected}" (${e.explanation})`).join("\n") : "None detected"}

PRONUNCIATION CONCERNS:
${input.pronunciationNotes.length ? input.pronunciationNotes.map((n) => `- "${n.word}": ${n.issue} — Tip: ${n.tip}`).join("\n") : "None detected"}

VOCABULARY TAUGHT:
${input.vocabSuggestions.length ? input.vocabSuggestions.map((v) => `- "${v.word}": ${v.definition}`).join("\n") : "None"}

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
    const response = await getClient().chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const text = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text);
    return {
      fluency_score: clamp(parsed.fluency_score ?? 5),
      grammar_score: clamp(parsed.grammar_score ?? 5),
      vocabulary_score: clamp(parsed.vocabulary_score ?? 5),
      pronunciation_score: clamp(parsed.pronunciation_score ?? 5),
      overall_score: clamp(parsed.overall_score ?? 5),
      overall_feedback: parsed.overall_feedback ?? "Session completed.",
      ai_analysis: parsed.ai_analysis ?? ""
    };
  } catch (err) {
    console.error("[Analysis] Failed to analyze conversation:", err);
    return {
      fluency_score: 5,
      grammar_score: 5,
      vocabulary_score: 5,
      pronunciation_score: 5,
      overall_score: 5,
      overall_feedback: "Analysis unavailable for this session.",
      ai_analysis: ""
    };
  }
}

function clamp(n: number): number {
  return Math.max(1, Math.min(10, Math.round(n)));
}
