"use client";
import Link, { type LinkProps } from "next/link";
import * as React from "react";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";

type HapticLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  hapticFeedback?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function HapticLink({ children, className, hapticFeedback = true, onClick, ...props }: HapticLinkProps) {
  return (
    <Link
      {...props}
      className={cn("tap-scale", className)}
      onClick={(event) => {
        if (hapticFeedback) haptic();
        // Trigger the global navigation progress bar
        if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey) {
          try { document.dispatchEvent(new Event("nav:start")); } catch (_) {}
        }
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
