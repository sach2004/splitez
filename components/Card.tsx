import { cn } from "@/lib/utils";
export default function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("app-card p-4", className)}>{children}</div>;
}
