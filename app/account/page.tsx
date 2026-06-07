import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import AppFrame from "@/components/AppFrame";
import Card from "@/components/Card";
import ThemeToggle from "@/components/ThemeToggle";
import { Bell, ChevronRight, CircleHelp, Globe2, IdCard, Mail, ShieldCheck, Star, WalletCards } from "lucide-react";

const settings = [[IdCard, "Name", "Sachin"], [Globe2, "Country", "🇮🇳 India"], [WalletCards, "Currency", "₹ Indian Rupee"], [Bell, "Notifications", "Alerts & reminders"]];
const support = [[CircleHelp, "Help & FAQ", "Common questions answered"], [Mail, "Contact us", "contact@arthlabs.co"], [Star, "Rate us", "Love Splitwell? Leave a review"], [ShieldCheck, "Privacy & Security", "Data protection & permissions"]];

export default async function Account() {
  const session = await getServerSession(authOptions);
  const name = session?.user?.name || "Guest";
  const email = session?.user?.email || "guest session";
  return (
    <AppFrame showFab={false}>
      <h1 className="page-title">Account</h1>
      <Card className="mt-7 flex items-center gap-4 p-4">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-purple-500 text-3xl">🎧</div>
        <div className="min-w-0"><h2 className="text-xl font-black">{name}</h2><p className="break-all text-[15px] leading-5 text-neutral-600 dark:text-neutral-300">{email}</p></div>
      </Card>
      <Section title="Settings" rows={settings} />
      <div className="mt-4"><ThemeToggle /></div>
      <Section title="Support" rows={support} />
    </AppFrame>
  );
}

function Section({ title, rows }: { title: string; rows: any[] }) {
  return (
    <section className="mt-7">
      <h2 className="mb-3 page-eyebrow">{title}</h2>
      <Card className="p-0">
        {rows.map(([Icon, a, b]) => (
          <div key={a} className="flex items-center gap-3 border-b border-neutral-100 p-4 last:border-0 dark:border-neutral-800">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-mint-50 text-mint-700 dark:bg-mint-900/30"><Icon className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><div className="text-[17px] font-black">{a}</div><div className="truncate text-sm text-neutral-500">{b}</div></div>
            <ChevronRight className="h-5 w-5 text-neutral-400" />
          </div>
        ))}
      </Card>
    </section>
  );
}
