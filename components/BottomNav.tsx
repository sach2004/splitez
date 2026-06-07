"use client";

import { usePathname } from "next/navigation";
import { Activity, Grid2X2, Settings, UsersRound, UserRoundPlus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
import { cn } from "@/lib/utils";

const items = [
  ["/dashboard", "Home",    Grid2X2],
  ["/groups",    "Groups",  UsersRound],
  ["/friends",   "Friends", UserRoundPlus],
  ["/activity",  "Activity", Activity],
  ["/account",   "Account", Settings],
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 mx-auto w-full max-w-[430px]",
        "rounded-t-[22px] border-t border-black/[.04]",
        "bg-[#f3f6f1]/95 dark:bg-[#171c1a]/95 backdrop-blur-xl",
        "px-1.5 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]",
        "shadow-[0_-6px_22px_rgba(0,0,0,.09)] dark:border-white/[.055] dark:shadow-[0_-6px_22px_rgba(0,0,0,.35)]"
      )}
    >
      <div className="grid grid-cols-5">
        {items.map(([href, label, Icon]) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(`${href}/`));
          return (
            <HapticLink
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 h-[50px] rounded-[15px]",
                "text-[10px] font-black leading-none tracking-tight",
                active ? "bg-mint-50 text-mint-700 dark:bg-mint-900/25 dark:text-mint-300" : "text-neutral-500 dark:text-neutral-400"
              )}
            >
              <Icon className="h-[20px] w-[20px] shrink-0" strokeWidth={active ? 2.8 : 2.2} />
              <span className="mt-0.5 w-full truncate px-1 text-center">{label}</span>
            </HapticLink>
          );
        })}
      </div>
      <div className="mx-auto mt-1.5 h-[3px] w-24 rounded-full bg-neutral-400/45 dark:bg-neutral-600/60" />
    </nav>
  );
}
