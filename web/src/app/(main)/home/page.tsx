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
import { User } from "lucide-react";
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
              Connect with the AI tutor and practice speaking in real-time
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="rounded-2xl border-2 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📚 History</CardTitle>
              <CardDescription>View past conversations</CardDescription>
            </CardHeader>
          </Card>
          <Card className="rounded-2xl border-2 transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">📈 Progress</CardTitle>
              <CardDescription>Track your learning</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}
