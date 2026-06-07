import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";
import { initials } from "@/lib/utils";
import {
  Bell, ChevronRight, CircleHelp, Globe2, IdCard, Mail, ShieldCheck, Star, WalletCards,
} from "lucide-react";

export default async function Account() {
  const session = await getServerSession(authOptions);
  const name  = session?.user?.name || "Guest";
  const email = session?.user?.email || "Not signed in";

  const settings = [
    [IdCard,      "Name",          name],
    [Globe2,      "Country",       "🇮🇳 India"],
    [WalletCards, "Currency",      "₹ Indian Rupee"],
    [Bell,        "Notifications", "Alerts & reminders"],
  ] as const;

  const support = [
    [CircleHelp,  "Help & FAQ",          "Common questions answered"],
    [Mail,        "Contact us",          "contact@arthlabs.co"],
    [Star,        "Rate us",             "Leave a review"],
    [ShieldCheck, "Privacy & Security",  "Data protection & permissions"],
  ] as const;

  return (
    <AppFrame showFab={false}>
      <h1 className="page-title">Account</h1>

      <Card className="mt-6 flex items-center gap-4 p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-mint-600 text-[26px] font-black text-white">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <h2 className="text-[20px] font-black">{name}</h2>
          <p className="break-all text-[14px] leading-5 text-[var(--muted)]">{email}</p>
        </div>
      </Card>

      <Section title="Settings" rows={settings} />
      <div className="mt-4"><ThemeToggle /></div>
      <Section title="Support" rows={support} />
    </AppFrame>
  );
}

function Section({
  title, rows,
}: {
  title: string;
  rows: readonly (readonly [React.ComponentType<{ className?: string }>, string, string])[];
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 page-eyebrow">{title}</h2>
      <Card className="p-0">
        {rows.map(([Icon, a, b]) => (
          <div key={a} className="flex items-center gap-3 border-b border-[var(--line)] p-4 last:border-0">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-mint-50 text-mint-700 dark:bg-mint-900/30">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-black">{a}</div>
              <div className="truncate text-[13px] text-[var(--muted)]">{b}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-[var(--muted)]" />
          </div>
        ))}
      </Card>
    </section>
  );
}
