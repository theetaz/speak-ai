"use client";

import { cn } from "@/lib/utils";

/**
 * Inline form error that reserves space to prevent layout shift.
 * Always renders a container; when error exists, shows message.
 * Uses em for responsive sizing (scales with font size across devices).
 */
export function FormError({
  error,
  className,
}: {
  error: string | null;
  className?: string;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "min-h-[2.5em] flex items-start text-sm font-medium text-destructive transition-opacity duration-200",
        error ? "opacity-100" : "opacity-0 pointer-events-none select-none",
        className,
      )}
    >
      {error ?? "\u00A0"}
    </div>
  );
}
