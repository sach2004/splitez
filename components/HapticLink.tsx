"use client";

import Link, { type LinkProps } from "next/link";
import * as React from "react";
import { useWebHaptics } from "web-haptics/react";
import { cn } from "@/lib/utils";

type HapticLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  haptic?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export function HapticLink({ children, className, haptic = true, onClick, ...props }: HapticLinkProps) {
  const { trigger } = useWebHaptics();
  return (
    <Link
      {...props}
      className={cn("tap-scale", className)}
      onClick={(event) => {
        if (haptic) trigger();
        onClick?.(event);
      }}
    >
      {children}
    </Link>
  );
}
