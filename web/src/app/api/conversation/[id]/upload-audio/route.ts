import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
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
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("audio") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No audio file" }, { status: 400 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const ext = file.type.includes("webm") ? "webm" : file.type.includes("ogg") ? "ogg" : "mp4";
  const fullPath = `${user.id}/${conversationId}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("conversation-audio")
    .upload(fullPath, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = await admin.storage
    .from("conversation-audio")
    .createSignedUrl(fullPath, 60 * 60 * 24 * 365);

  const audioUrl = urlData?.signedUrl ?? fullPath;

  await admin
    .from("conversations")
    .update({ audio_url: audioUrl })
    .eq("id", conversationId);

  // Per-message clips
  const msgFiles: { index: number; file: File }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("msg_") && value instanceof File) {
      const index = parseInt(key.replace("msg_", ""), 10);
      if (!isNaN(index)) msgFiles.push({ index, file: value });
    }
  }

  if (msgFiles.length > 0) {
    const msgDir = `${user.id}/${conversationId}`;
    for (const { index, file } of msgFiles.sort((a, b) => a.index - b.index)) {
      const path = `${msgDir}/msg_${index}.webm`;
      await admin.storage
        .from("conversation-audio")
        .upload(path, file, { upsert: true, contentType: file.type });
    }

    // Agent persists on disconnect; retry to fetch messages
    for (let attempt = 0; attempt < 8; attempt++) {
      const { data: messages } = await admin
        .from("messages")
        .select("id")
        .eq("conversation_id", conversationId)
        .order("timestamp_ms", { ascending: true });

      if (messages && messages.length >= msgFiles.length) {
        for (let i = 0; i < msgFiles.length && i < messages.length; i++) {
          const path = `${msgDir}/msg_${i}.webm`;
          const { data: signed } = await admin.storage
            .from("conversation-audio")
            .createSignedUrl(path, 60 * 60 * 24 * 365);
          if (signed?.signedUrl) {
            await admin
              .from("messages")
              .update({ audio_url: signed.signedUrl })
              .eq("id", messages[i].id);
          }
        }
        break;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return NextResponse.json({ audioUrl });
}
