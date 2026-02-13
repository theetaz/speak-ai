import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConversationRoom } from "@/components/conversation-room";

export default async function ConversationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <ConversationRoom />
    </div>
  );
}
