"use client";

import * as React from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type HapticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  hapticFeedback?: boolean;
  spinnerDark?: boolean;
};

export function HapticButton({
  loading = false,
  loadingText,
  hapticFeedback = true,
  spinnerDark = false,
  disabled,
  onClick,
  className,
  children,
  ...props
}: HapticButtonProps) {
  const locked = disabled || loading;

  return (
    <button
      {...props}
      disabled={locked}
      aria-busy={loading || undefined}
      className={cn(
        "tap-scale inline-flex items-center justify-center gap-2 disabled:opacity-65",
        className
      )}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        if (hapticFeedback) haptic();
        onClick?.(event);
      }}
    >
      {loading && (
        <span className={cn("spinner shrink-0", spinnerDark && "spinner-dark")} />
      )}
      {/* inline-flex so icon + text sit side by side, never stacked */}
      <span className="inline-flex items-center gap-1.5">
        {loading ? (loadingText ?? children) : children}
      </span>
    </button>
  );
}
