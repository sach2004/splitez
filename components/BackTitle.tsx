import { ArrowLeft } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";
export default function BackTitle({ title, href = "/groups" }: { title: string; href?: string }) {
  return (
    <div className="mb-8 flex items-center gap-5">
      <HapticLink href={href} className="grid h-11 w-11 place-items-center rounded-full text-neutral-900 dark:text-white">
        <ArrowLeft className="h-6 w-6" strokeWidth={2.7} />
      </HapticLink>
      <h1 className="text-[25px] font-black tracking-[-.03em]">{title}</h1>
    </div>
  );
}
