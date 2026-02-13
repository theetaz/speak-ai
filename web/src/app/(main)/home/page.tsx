import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { User, ChevronRight } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export default async function HomeDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Learner";

  const { data: recentConversations } = await supabase
    .from("conversations")
    .select("id, started_at, duration_seconds, status, topic")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hello, {displayName}!</h1>
            <p className="text-muted-foreground">
              Ready to practice your English?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="icon" className="rounded-full">
              <Link href="/profile">
                <User className="size-4" />
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </div>

        <Card className="rounded-2xl border-2 overflow-hidden transition-shadow hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              Start a conversation
            </CardTitle>
            <CardDescription>
              Have a 2-minute voice session with Alex, your AI English tutor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              size="lg"
              className="rounded-full h-12 font-bold text-base shadow-lg w-full hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <Link href="/conversation">Start Practice</Link>
            </Button>
          </CardContent>
        </Card>

        {recentConversations && recentConversations.length > 0 && (
          <Card className="rounded-2xl border-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Recent Conversations</CardTitle>
              <CardDescription>Review your past sessions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {recentConversations.map((conv) => {
                const date = new Date(conv.started_at).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" },
                );
                const duration = conv.duration_seconds
                  ? `${Math.floor(conv.duration_seconds / 60)}m ${conv.duration_seconds % 60}s`
                  : "In progress";
                return (
                  <Link
                    key={conv.id}
                    href={`/conversation/${conv.id}/review`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {conv.topic ?? "Practice Session"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {date} &middot; {duration} &middot;{" "}
                        <span
                          className={
                            conv.status === "completed"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {conv.status}
                        </span>
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-2 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📈 Progress</CardTitle>
              <CardDescription>Track your learning</CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-2 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">👤 Profile</CardTitle>
              <CardDescription>
                <Link href="/profile" className="hover:underline">
                  Update your learning preferences
                </Link>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
