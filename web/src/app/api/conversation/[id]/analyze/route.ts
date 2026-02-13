import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI();

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, user_id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Check if analysis already exists
  const { data: existingFeedback } = await supabase
    .from("conversation_feedback")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  if (existingFeedback?.ai_analysis) {
    return NextResponse.json(existingFeedback);
  }

  // Load transcript
  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, timestamp_ms")
    .eq("conversation_id", conversationId)
    .order("timestamp_ms", { ascending: true });

  if (!messages?.length) {
    return NextResponse.json(
      { error: "No transcript found" },
      { status: 404 },
    );
  }

  const grammarCorrections = existingFeedback?.grammar_corrections ?? [];
  const pronunciationNotes = existingFeedback?.pronunciation_notes ?? [];
  const vocabularySuggestions = existingFeedback?.vocabulary_suggestions ?? [];

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

    // Use service role to update since RLS only allows SELECT for feedback
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (existingFeedback) {
      await admin
        .from("conversation_feedback")
        .update(updates)
        .eq("id", existingFeedback.id);
    } else {
      await admin.from("conversation_feedback").insert({
        conversation_id: conversationId,
        grammar_corrections: grammarCorrections,
        pronunciation_notes: pronunciationNotes,
        vocabulary_suggestions: vocabularySuggestions,
        ...updates,
      });
    }

    return NextResponse.json({ ...existingFeedback, ...updates });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
