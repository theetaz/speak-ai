import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationList } from "@/components/conversation-list";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 20;

export default async function ConversationsPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1", 10));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: conversations, count, error } = await supabase
    .from("conversations")
    .select("id, started_at, duration_seconds, status, topic", { count: "exact" })
    .eq("user_id", user.id)
    .order("started_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[Conversations] Supabase error:", error);
  }

  const ids = (conversations ?? []).map((c) => c.id);
  const scoresMap = new Map<string, number | null>();
  if (ids.length > 0) {
    const { data: feedback } = await supabase
      .from("conversation_feedback")
      .select("conversation_id, overall_score")
      .in("conversation_id", ids);
    for (const f of feedback ?? []) {
      scoresMap.set(f.conversation_id, f.overall_score);
    }
  }

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link href="/home">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">My Sessions</h1>
            <p className="text-sm text-muted-foreground">
              {count ?? 0} total conversation{(count ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <Card className="rounded-2xl border-2">
          <CardHeader className="pb-2">
            <CardTitle>All Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <p className="text-sm text-destructive py-4 text-center">
                Failed to load conversations. Please try again.
              </p>
            )}
            {!error && (
            <ConversationList
              conversations={
                conversations?.map((c) => ({
                  id: c.id,
                  started_at: c.started_at,
                  duration_seconds: c.duration_seconds,
                  status: c.status,
                  topic: c.topic,
                  overall_score: scoresMap.get(c.id) ?? null,
                })) ?? []
              }
            />
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/conversations?page=${page - 1}`}>Previous</Link>
              </Button>
            )}
            <span className="flex items-center text-sm text-muted-foreground px-3">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/conversations?page=${page + 1}`}>Next</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
