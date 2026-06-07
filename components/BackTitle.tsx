import { ArrowLeft } from "lucide-react";
import { HapticLink } from "@/components/HapticLink";

export default function BackTitle({
  title,
  href = "/groups",
}: {
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-7 flex items-center gap-3">
      <HapticLink
        href={href}
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--soft)] text-[var(--foreground)]"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
      </HapticLink>
      <h1 className="text-[22px] font-black tracking-[-.03em]">{title}</h1>
    </div>
  );
}
