import { Plus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";

export default function FloatingAddButton() {
  return (
    <div
      className={[
        "pointer-events-none",
        "fixed z-30",
        "bottom-[calc(84px+env(safe-area-inset-bottom))]",
        "left-1/2 -translate-x-1/2",
        "w-[min(100vw,430px)]",
        "px-4",
      ].join(" ")}
    >
      <HapticLink
        href="/expense/new"
        className={[
          "pointer-events-auto",
          "ml-auto flex",
          "h-[44px] w-[156px]",
          "items-center justify-center gap-1.5",
          "rounded-[14px]",
          "bg-gradient-to-r from-mint-700 to-mint-400",
          "text-[14px] font-black text-white",
          "shadow-[0_10px_28px_rgba(0,128,105,.25)]",
        ].join(" ")}
      >
        <Plus className="h-4 w-4 shrink-0" strokeWidth={3} />
        <span className="whitespace-nowrap">Add Expense</span>
      </HapticLink>
    </div>
  );
}
