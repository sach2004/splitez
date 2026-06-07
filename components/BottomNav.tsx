"use client";

import { usePathname } from "next/navigation";
import { Activity, Grid2X2, Settings, UsersRound, UserRoundPlus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
import { cn } from "@/lib/utils";

const items = [
  ["/dashboard", "Dashboard", Grid2X2],
  ["/groups", "Groups", UsersRound],
  ["/friends", "Friends", UserRoundPlus],
  ["/activity", "Activity", Activity],
  ["/account", "Account", Settings],
] as const;

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-[min(100vw,430px)] -translate-x-1/2 rounded-t-[24px] border-t border-black/[.04] bg-[#f3f6f1]/95 px-2 pb-[calc(9px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_26px_rgba(0,0,0,.10)] backdrop-blur-xl dark:border-white/[.06] dark:bg-[#171c1a]/95">
      <div className="grid grid-cols-5 gap-1">
        {items.map(([href, label, Icon]) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <HapticLink
              key={href}
              href={href}
              className={cn(
                "flex h-[52px] min-w-0 flex-col items-center justify-center rounded-[17px] text-[10.5px] font-black leading-none text-neutral-500 dark:text-neutral-400",
                active && "bg-mint-50 text-mint-700 dark:bg-mint-900/25 dark:text-mint-300"
              )}
            >
              <Icon className="mb-1 h-[21px] w-[21px] shrink-0" strokeWidth={active ? 2.9 : 2.35} />
              <span className="truncate">{label}</span>
            </HapticLink>
          );
        })}
      </div>
      <div className="mx-auto mt-1.5 h-1 w-20 rounded-full bg-neutral-400/55 dark:bg-neutral-700" />
    </nav>
  );
}
