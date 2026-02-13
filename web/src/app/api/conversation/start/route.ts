import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY ?? "devkey";
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET ?? "secret";
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "ws://localhost:7880";

async function createLiveKitToken(
  identity: string,
  roomName: string,
  metadata: string,
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: LIVEKIT_API_KEY,
    sub: identity,
    iat: now,
    nbf: now,
    exp: now + 3600,
    name: identity,
    metadata,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
    roomConfig: {
      agents: [{ agentName: "speakeasy-agent", metadata }],
    },
  };

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const data = `${encode(header)}.${encode(payload)}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LIVEKIT_API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${data}.${sigStr}`;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role to bypass RLS for profile upsert
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // Ensure profile exists (conversations.user_id references profiles.id)
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const displayName =
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      user.email?.split("@")[0] ??
      "Learner";

    await admin.from("profiles").insert({
      id: user.id,
      display_name: displayName,
      native_language: "Unknown",
      english_level: "B1",
    });
  }

  // Reload profile for metadata
  const { data: freshProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Create conversation row
  const roomName = `conv_${crypto.randomUUID().slice(0, 8)}_${Date.now()}`;
  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .insert({
      user_id: user.id,
      status: "active",
      livekit_room_name: roomName,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (convError || !conversation) {
    return NextResponse.json(
      { error: convError?.message ?? "Failed to create conversation" },
      { status: 500 },
    );
  }

  // Build metadata for the agent
  const metadata = JSON.stringify({
    user_id: user.id,
    conversation_id: conversation.id,
    english_level: freshProfile?.english_level ?? "B1",
    native_language: freshProfile?.native_language ?? "unknown",
    learning_goals: freshProfile?.learning_goals ?? [],
    preferred_topics: freshProfile?.preferred_topics ?? [],
    display_name: freshProfile?.display_name ?? "Learner",
  });

  // Generate LiveKit token directly (no edge function dependency)
  const token = await createLiveKitToken(user.id, roomName, metadata);

  return NextResponse.json({
    conversationId: conversation.id,
    token,
    wsUrl: LIVEKIT_URL,
    roomName,
  });
}
