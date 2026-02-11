"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormError } from "@/components/ui/form-error";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const ENGLISH_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

interface ProfileFormProps {
  user: {
    id: string;
    email: string;
    provider: string;
    displayName: string;
    nativeLanguage: string;
    englishLevel: string;
    learningGoals: string[];
    preferredTopics: string[];
    avatarUrl: string;
    hasProfile: boolean;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [nativeLanguage, setNativeLanguage] = useState(user.nativeLanguage);
  const [englishLevel, setEnglishLevel] = useState(user.englishLevel);
  const [learningGoals, setLearningGoals] = useState(user.learningGoals.join(", "));
  const [preferredTopics, setPreferredTopics] = useState(user.preferredTopics.join(", "));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      if (authError) throw authError;

      const profileData = {
        id: user.id,
        display_name: displayName.trim(),
        native_language: nativeLanguage.trim() || "Unknown",
        english_level: englishLevel || "A1",
        learning_goals: learningGoals
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        preferred_topics: preferredTopics
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, { onConflict: "id" });
      if (profileError) throw profileError;

      toast.success("Profile updated!");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to delete account");
      }
      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const providerLabel =
    user.provider === "google" ? "Google" : user.provider === "email" ? "Email & Password" : user.provider;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="rounded-full">
          <Link href="/home">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-sm text-muted-foreground">Manage your account settings</p>
        </div>
      </div>

      <Card className="rounded-2xl border-2">
        <CardHeader>
          <CardTitle>Account Info</CardTitle>
          <CardDescription>Your sign-in details (read-only)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Sign-in method</span>
            <span className="font-medium inline-flex items-center gap-1.5">
              {user.provider === "google" && (
                <svg className="size-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              {providerLabel}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-2">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
          <CardDescription>Update your learning profile</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError(null);
                }}
                className="h-12 rounded-xl"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nativeLanguage">Native Language</Label>
              <Input
                id="nativeLanguage"
                placeholder="e.g. Spanish, Japanese, Tamil"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="englishLevel">English Level</Label>
              <div className="flex flex-wrap gap-2">
                {ENGLISH_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEnglishLevel(level)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium border-2 transition-all",
                      englishLevel === level
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50",
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learningGoals">Learning Goals</Label>
              <Input
                id="learningGoals"
                placeholder="e.g. Fluency, Business English, IELTS (comma-separated)"
                value={learningGoals}
                onChange={(e) => setLearningGoals(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferredTopics">Preferred Topics</Label>
              <Input
                id="preferredTopics"
                placeholder="e.g. Travel, Technology, Sports (comma-separated)"
                value={preferredTopics}
                onChange={(e) => setPreferredTopics(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <FormError error={error} />
            <LoadingButton
              type="submit"
              size="lg"
              loading={saving}
              loadingText="Saving..."
              className={cn(
                "w-full rounded-full h-12 font-bold text-lg shadow-lg",
                "hover:scale-[1.02] active:scale-[0.98] transition-transform",
              )}
            >
              Save Changes
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-2 border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {confirmDelete ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                This action is <strong>irreversible</strong>. All your conversations,
                progress, and profile data will be permanently deleted.
              </p>
              <Separator />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 rounded-full"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <LoadingButton
                  variant="destructive"
                  loading={deleting}
                  loadingText="Deleting..."
                  className="flex-1 rounded-full"
                  onClick={handleDelete}
                >
                  Yes, Delete My Account
                </LoadingButton>
              </div>
            </div>
          ) : (
            <Button
              variant="destructive"
              className="rounded-full"
              onClick={() => setConfirmDelete(true)}
            >
              Delete Account
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
