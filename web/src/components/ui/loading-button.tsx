"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingText?: string;
}

function LoadingButton({
  loading = false,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn("transition-all duration-200", className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>{loadingText ?? "Loading..."}</span>
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export { LoadingButton };
