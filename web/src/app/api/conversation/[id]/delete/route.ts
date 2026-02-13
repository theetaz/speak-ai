import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function DELETE(
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

  // Fetch conversation to get audio_url before deleting
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, audio_url")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Delete audio from storage if exists
  if (conv.audio_url) {
    const storagePath = `${user.id}/${conversationId}`;
    // Try common extensions
    for (const ext of ["webm", "ogg", "mp4"]) {
      await admin.storage.from("conversation-audio").remove([`${storagePath}.${ext}`]);
    }
  }

  // Delete feedback, messages, then conversation (cascade should handle it, but be explicit)
  await admin.from("conversation_feedback").delete().eq("conversation_id", conversationId);
  await admin.from("messages").delete().eq("conversation_id", conversationId);
  await admin.from("conversations").delete().eq("id", conversationId);

  return NextResponse.json({ success: true });
}
