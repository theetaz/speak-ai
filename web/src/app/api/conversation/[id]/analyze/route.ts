import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { runConversationAnalysis } from "@/lib/analyze-conversation";

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

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, user_id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: existingFeedback } = await supabase
    .from("conversation_feedback")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  if (existingFeedback?.ai_analysis) {
    return NextResponse.json(existingFeedback);
  }

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

  const result = await runConversationAnalysis({
    conversationId,
    messages,
    grammarCorrections: (existingFeedback?.grammar_corrections as unknown[]) ?? [],
    pronunciationNotes: (existingFeedback?.pronunciation_notes as unknown[]) ?? [],
    vocabularySuggestions: (existingFeedback?.vocabulary_suggestions as unknown[]) ?? [],
  });

  if (!result.updated) {
    return NextResponse.json(
      { error: result.error ?? "Analysis failed" },
      { status: 500 },
    );
  }

  const { data: updated } = await supabase
    .from("conversation_feedback")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  return NextResponse.json(updated ?? existingFeedback);
}
