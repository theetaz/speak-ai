import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { runConversationAnalysis } from "@/lib/analyze-conversation";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: convs } = await admin
    .from("conversations")
    .select("id")
    .eq("status", "completed");

  if (!convs?.length) {
    console.log("[Cron] No completed conversations to analyze");
    return NextResponse.json({ processed: 0 });
  }

  const ids = convs.map((c) => c.id);
  const { data: feedbackRows } = await admin
    .from("conversation_feedback")
    .select("conversation_id, grammar_corrections, pronunciation_notes, vocabulary_suggestions, ai_analysis")
    .in("conversation_id", ids);

  const needsAnalysis = convs
    .filter((c) => {
      const fb = feedbackRows?.find((f) => f.conversation_id === c.id);
      return !fb?.ai_analysis;
    })
    .slice(0, 5);

  let processed = 0;
  console.log(`[Cron] Analyzing ${needsAnalysis.length} pending conversation(s)`);
  for (const conv of needsAnalysis) {
    try {
      const { data: messages } = await admin
        .from("messages")
        .select("role, content, timestamp_ms")
        .eq("conversation_id", conv.id)
        .order("timestamp_ms", { ascending: true });

      if (!messages?.length) {
        console.log(`[Cron] Skipping ${conv.id}: no messages`);
        continue;
      }

      const fb = feedbackRows?.find((f) => f.conversation_id === conv.id);
      const result = await runConversationAnalysis({
        conversationId: conv.id,
        messages,
        grammarCorrections: (fb?.grammar_corrections as unknown[]) ?? [],
        pronunciationNotes: (fb?.pronunciation_notes as unknown[]) ?? [],
        vocabularySuggestions: (fb?.vocabulary_suggestions as unknown[]) ?? [],
      });

      if (result.updated) {
        processed++;
        console.log(`[Cron] Analyzed conversation ${conv.id}`);
      }
    } catch (err) {
      console.error(`[Cron] Failed to analyze ${conv.id}:`, err);
    }
  }

  console.log(`[Cron] Done. Processed ${processed} conversation(s)`);
  return NextResponse.json({ processed });
}
