import { ReceiptText, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

export default function EmptyState({ title, subtitle, type = "receipt", compact = false }: { title?: string; subtitle: string; type?: "receipt" | "users"; compact?: boolean }) {
  const Icon = type === "users" ? UsersRound : ReceiptText;
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "py-10" : "py-16")}>
      <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-mint-50 text-mint-700 dark:bg-mint-900/25 dark:text-mint-300">
        <Icon className="h-12 w-12" strokeWidth={2.6} />
      </div>
      {title && <h2 className="mt-7 text-[25px] font-black tracking-[-.03em]">{title}</h2>}
      <p className="mt-3 max-w-[280px] text-[18px] leading-7 text-neutral-500 dark:text-neutral-400">{subtitle}</p>
    </div>
  );
}
