"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import { LoadingButton } from "@/components/ui/loading-button";

export function SignOutButton() {
  const router = useRouter();
  const supabase = useSupabaseClient();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      toast.success("Signed out successfully");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoadingButton
      variant="outline"
      size="sm"
      loading={loading}
      loadingText="Signing out..."
      onClick={handleSignOut}
      className="rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      Sign out
    </LoadingButton>
  );
}
