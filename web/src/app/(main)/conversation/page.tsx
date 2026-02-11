import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ConversationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-2xl mx-auto rounded-2xl border-2 transition-shadow hover:shadow-lg">
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Real-time conversation UI coming soon. Connect to LiveKit agent here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
