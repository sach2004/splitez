"use client";

import * as React from "react";
import { useWebHaptics } from "web-haptics/react";
import { cn } from "@/lib/utils";

type HapticButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingText?: string;
  haptic?: boolean;
  spinnerDark?: boolean;
};

export function HapticButton({
  loading = false,
  loadingText,
  haptic = true,
  spinnerDark = false,
  disabled,
  onClick,
  className,
  children,
  ...props
}: HapticButtonProps) {
  const { trigger } = useWebHaptics();
  const locked = disabled || loading;

  return (
    <button
      {...props}
      disabled={locked}
      aria-busy={loading || undefined}
      className={cn("tap-scale inline-flex items-center justify-center gap-2 disabled:opacity-65", className)}
      onClick={(event) => {
        if (locked) {
          event.preventDefault();
          return;
        }
        if (haptic) trigger();
        onClick?.(event);
      }}
    >
      {loading && <span className={cn("spinner", spinnerDark && "spinner-dark")} />}
      <span>{loading ? loadingText || children : children}</span>
    </button>
  );
}
