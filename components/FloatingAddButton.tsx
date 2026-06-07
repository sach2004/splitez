import { Plus } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";

export default function FloatingAddButton() {
  return (
    <div className="pointer-events-none fixed bottom-[calc(88px+env(safe-area-inset-bottom))] left-1/2 z-30 w-[min(100vw,430px)] -translate-x-1/2 px-5">
      <HapticLink
        href="/expense/new"
        className="pointer-events-auto ml-auto flex h-[46px] w-[168px] items-center justify-center gap-2 rounded-[17px] bg-gradient-to-r from-mint-700 to-mint-400 text-[15px] font-black text-white shadow-[0_12px_30px_rgba(0,128,105,.23)]"
      >
        <Plus className="h-5 w-5 shrink-0" strokeWidth={3} />
        <span className="whitespace-nowrap">Add Expense</span>
      </HapticLink>
    </div>
  );
}
