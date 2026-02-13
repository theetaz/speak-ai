import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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

  const { data: feedback } = await supabase
    .from("conversation_feedback")
    .select("*")
    .eq("conversation_id", conversationId)
    .single();

  if (!feedback) {
    return NextResponse.json(null);
  }

  return NextResponse.json(feedback);
}
