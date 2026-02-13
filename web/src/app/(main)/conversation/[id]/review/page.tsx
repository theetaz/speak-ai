import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationReview } from "@/components/conversation-review";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ReviewPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!conversation) redirect("/home");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("timestamp_ms", { ascending: true });

  const { data: feedback } = await supabase
    .from("conversation_feedback")
    .select("*")
    .eq("conversation_id", id)
    .single();

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto">
        <ConversationReview
          conversationId={id}
          conversation={conversation}
          messages={
            messages?.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
              timestamp_ms: m.timestamp_ms,
              isFinal: true,
              audio_url: m.audio_url,
            })) ?? []
          }
          feedback={feedback}
          audioUrl={conversation.audio_url}
        />
      </div>
    </div>
  );
}
