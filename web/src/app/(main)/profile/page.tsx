import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const provider =
    user.app_metadata?.provider ??
    user.app_metadata?.providers?.[0] ??
    "email";

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto">
        <ProfileForm
          user={{
            id: user.id,
            email: user.email ?? "",
            provider,
            displayName:
              profile?.display_name ??
              user.user_metadata?.display_name ??
              user.user_metadata?.full_name ??
              "",
            nativeLanguage: profile?.native_language ?? "",
            englishLevel: profile?.english_level ?? "",
            learningGoals: profile?.learning_goals ?? [],
            preferredTopics: profile?.preferred_topics ?? [],
            avatarUrl: profile?.avatar_url ?? user.user_metadata?.avatar_url ?? "",
            hasProfile: !!profile,
          }}
        />
      </div>
    </div>
  );
}
