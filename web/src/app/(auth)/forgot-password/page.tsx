"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useSupabaseClient } from "@/hooks/use-supabase-client";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { AppLogo } from "@/components/app-logo";
import { cn } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const supabase = useSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` },
      );
      if (error) throw error;
      setSent(true);
      toast.success("Reset link sent! Check your email.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset email";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md shadow-xl border-2 rounded-3xl overflow-hidden animate-scale-in">
        <CardHeader className="space-y-1 text-center pb-2">
          <AppLogo size={80} className="mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Reset password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl">📬</div>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to <strong>{email}</strong>.
                Check your inbox and follow the link to reset your password.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t receive it? Check spam or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="font-semibold text-primary hover:underline"
                >
                  try again
                </button>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="h-12 rounded-xl transition-colors"
                  autoComplete="email"
                  required
                />
              </div>
              <FormError error={error} />
              <LoadingButton
                type="submit"
                size="lg"
                loading={loading}
                loadingText="Sending..."
                className={cn(
                  "w-full rounded-full h-12 font-bold text-lg shadow-lg",
                  "hover:scale-[1.02] active:scale-[0.98] transition-transform",
                )}
              >
                Send Reset Link
              </LoadingButton>
            </form>
          )}
          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
