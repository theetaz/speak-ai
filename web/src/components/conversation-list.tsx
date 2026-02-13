"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConversationItem {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  status: string;
  topic: string | null;
  overall_score: number | null;
}

interface Props {
  conversations: ConversationItem[];
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ConversationList({ conversations: initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/conversation/${id}/delete`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setItems((prev) => prev.filter((c) => c.id !== id));
      toast.success("Conversation deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete conversation");
    } finally {
      setDeleting(null);
      setDeleteTarget(null);
    }
  };

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No conversations yet. Start your first practice session!
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((conv) => {
        const date = formatDate(conv.started_at);
        const duration = conv.duration_seconds
          ? `${Math.floor(conv.duration_seconds / 60)}m ${conv.duration_seconds % 60}s`
          : "In progress";

        return (
          <div
            key={conv.id}
            className="flex items-center gap-2 rounded-xl hover:bg-muted/50 transition-colors group"
          >
            <Link
              href={`/conversation/${conv.id}/review`}
              className="flex-1 flex items-center justify-between px-3 py-3"
            >
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-medium truncate">
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
              <div className="flex items-center gap-2 shrink-0">
                {conv.overall_score != null && (
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      conv.overall_score >= 7
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                        : conv.overall_score >= 5
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
                    )}
                  >
                    {conv.overall_score}/10
                  </span>
                )}
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
            <AlertDialog
              open={deleteTarget === conv.id}
              onOpenChange={(open) => setDeleteTarget(open ? conv.id : null)}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 mr-1 rounded-full text-muted-foreground hover:text-destructive"
                  disabled={deleting === conv.id}
                >
                  {deleting === conv.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this conversation and its feedback. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleDelete(conv.id)}
                    disabled={deleting === conv.id}
                  >
                    {deleting === conv.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      })}
    </div>
  );
}
