import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/app-logo";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-background via-background to-muted/40">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <AppLogo size={112} className="mx-auto shadow-lg" />
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight lg:text-5xl">
            SpeakEasy AI
          </h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Your real-time English learning assistant. Practice speaking with
            AI-powered feedback and improve your fluency.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="rounded-full h-12 px-8 font-bold text-base shadow-lg hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Link href="/login">Sign In</Link>
          </Button>
          <Button
            asChild
            variant="secondary"
            size="lg"
            className="rounded-full h-12 px-8 font-bold text-base hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
