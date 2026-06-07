"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Car, Clapperboard, Fuel, Hotel, ImagePlus, ReceiptText, ShoppingCart, Utensils, Zap, Shapes, X } from "lucide-react";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { money } from "@/lib/utils";

type Group = { id: string; name: string; members: { id: string; name: string }[] };
type Item = { id: string; name: string; price: number; memberIds: string[] };
const cats = [["FOOD", "Food", Utensils], ["TRAVEL", "Travel", Car], ["HOTEL", "Hotel", Hotel], ["FUN", "Fun", Clapperboard], ["GROCERIES", "Groceries", ShoppingCart], ["FUEL", "Fuel", Fuel], ["UTILITIES", "Utilities", Zap], ["OTHER", "Other", Shapes]] as const;

export default function ExpenseForm({ groups }: { groups: Group[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const initial = params.get("groupId") || groups[0]?.id || "";
  const [groupId, setGroupId] = useState(initial);
  const group = groups.find((g) => g.id === groupId);
  const [amount, setAmount] = useState("0.00");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("FOOD");
  const [splitMode, setSplitMode] = useState<"EQUAL" | "UNEQUAL" | "PERCENT">("EQUAL");
  const [sheet, setSheet] = useState<"group" | "split" | "paid" | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { const total = items.reduce((s, i) => s + i.price, 0); if (total > 0) setAmount(total.toFixed(2)); }, [items]);
  const selectedMembers = group?.members || [];
  const splitText = splitMode === "EQUAL" ? `Split amount equally among ${selectedMembers.length} people.` : items.length ? "Assign each receipt item to one or more members." : "Upload a receipt first or save manual unequal split.";

  async function parseReceipt(file: File) {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/receipt/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Receipt parsing failed");
      setItems((data.items || []).map((x: any, i: number) => ({ id: crypto.randomUUID(), name: x.name || `Item ${i + 1}`, price: Number(x.price || 0), memberIds: selectedMembers.map((m) => m.id) })));
      setSplitMode("UNEQUAL");
    } catch (err: any) { alert(err.message || "Receipt parsing failed"); }
    finally { setLoadingAi(false); }
  }

  function setAll(itemId: string, all: boolean) { setItems((v) => v.map((i) => i.id === itemId ? { ...i, memberIds: all ? selectedMembers.map((m) => m.id) : [] } : i)); }
  function toggle(itemId: string, memberId: string) { setItems((v) => v.map((i) => i.id === itemId ? { ...i, memberIds: i.memberIds.includes(memberId) ? i.memberIds.filter((x) => x !== memberId) : [...i.memberIds, memberId] } : i)); }

  const shares = useMemo(() => {
    const out: Record<string, number> = {}; for (const m of selectedMembers) out[m.id] = 0;
    if (splitMode === "EQUAL") { const each = Number(amount || 0) / (selectedMembers.length || 1); for (const m of selectedMembers) out[m.id] = each; }
    else { for (const i of items) { const each = i.price / (i.memberIds.length || 1); for (const id of i.memberIds) out[id] = (out[id] || 0) + each; } }
    return out;
  }, [amount, items, selectedMembers, splitMode]);

  async function save() {
    if (saving) return;
    if (!groupId) return alert("Select a group first");
    setSaving(true);
    try {
      const payload = { groupId, description: description || "Receipt expense", amount: Number(amount), category, splitMode, guestSessionId: getGuestSessionId(), items: splitMode === "UNEQUAL" ? items : [] };
      const res = await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/groups/${groupId}`);
    } catch (err: any) { alert(err.message || "Save failed"); setSaving(false); }
  }

  return (
    <main className="app-shell">
      <div className="form-content">
        <div className="flex items-center gap-3">
          <HapticButton onClick={() => router.back()} className="grid h-10 w-10 place-items-center rounded-full"><X className="h-6 w-6" /></HapticButton>
          <h1 className="flex-1 text-[24px] font-black tracking-[-.03em]">Add expense</h1>
          <HapticButton onClick={() => setSheet("group")} className="rounded-[14px] bg-red-50 px-3 py-2 text-sm font-black text-red-700 dark:bg-red-950/30">{group?.name || "Select group"}</HapticButton>
          <HapticButton onClick={save} loading={saving} loadingText="Saving" spinnerDark className="text-[16px] font-black text-mint-700">Save</HapticButton>
        </div>

        <div className="mt-8 flex items-center gap-3 text-[17px]"><span>Split between</span><HapticButton onClick={() => setSheet("group")} className="btn-secondary min-h-10 px-4 text-[16px]">{selectedMembers.length ? `${selectedMembers.length} members` : "No members"}⌄</HapticButton></div>

        <label className="mt-7 block text-[17px] font-black">Amount</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="input-field mt-3 h-[72px] px-8 text-[42px] font-medium tracking-[-.04em]" />
        <label className="mt-6 block text-[17px] font-black">Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter a description" className="input-field mt-3 h-14 px-4 text-lg" />

        <div className="mt-6 grid grid-cols-[auto_1fr_auto_1fr] items-center gap-3 text-[16px]"><span>Paid by</span><HapticButton onClick={() => setSheet("paid")} className="btn-secondary min-h-10 px-3">You⌄</HapticButton><span>Split</span><HapticButton onClick={() => setSheet("split")} className="btn-secondary min-h-10 px-3">{splitMode === "EQUAL" ? "Equally" : splitMode === "UNEQUAL" ? "Unequally" : "By %"}⌄</HapticButton></div>

        <label className="mt-6 block text-[17px] font-black">Date</label>
        <div className="input-field mt-3 flex h-14 items-center justify-between px-4 text-lg"><span className="flex items-center gap-3"><Calendar className="h-5 w-5" />Jun 7, 2026</span><span>⌄</span></div>

        <label className="mt-6 block text-[17px] font-black">Category</label>
        <div className="mt-3 grid grid-cols-4 gap-3">{cats.map(([id, label, Icon]) => <HapticButton key={id} onClick={() => setCategory(id)} className={`h-[78px] flex-col rounded-[18px] text-[12px] font-black ${category === id ? "bg-orange-100 text-orange-600" : "bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"}`}><Icon className="h-6 w-6" /><span>{label}</span></HapticButton>)}</div>

        <div className="app-card mt-7 p-4">
          <div className="mb-3 flex items-center gap-2 text-[17px] font-black"><ReceiptText className="h-5 w-5" />Receipt (Optional)</div>
          <label className={`tap-scale flex h-14 cursor-pointer items-center justify-center gap-2 rounded-[16px] border border-neutral-200 bg-neutral-50 text-[16px] font-black text-mint-700 dark:border-neutral-700 dark:bg-neutral-950 ${loadingAi ? "pointer-events-none opacity-70" : ""}`}>
            {loadingAi ? <span className="spinner spinner-dark" /> : <ImagePlus className="h-5 w-5" />} {loadingAi ? "Scanning receipt..." : "Add receipt"}
            <input type="file" accept="image/*" hidden disabled={loadingAi} onChange={(e) => e.target.files?.[0] && parseReceipt(e.target.files[0])} />
          </label>
          <p className="mt-2 text-xs leading-5 text-neutral-500">JPG, PNG, GIF, WebP, HEIC or PDF · Max 100MB</p>
        </div>

        {items.length > 0 && <div className="mt-7 space-y-3"><h2 className="text-[23px] font-black tracking-[-.03em]">Parsed items</h2>{items.map((i) => <div key={i.id} className="app-card p-4"><div className="flex justify-between gap-4 text-[16px] font-black"><span>{i.name}</span><span>{money(i.price)}</span></div><div className="my-3 flex gap-2"><HapticButton onClick={() => setAll(i.id, true)} className="rounded-full bg-mint-50 px-3 py-1.5 text-xs font-black text-mint-700">Select All</HapticButton><HapticButton onClick={() => setAll(i.id, false)} className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-black dark:bg-neutral-800">Unselect All</HapticButton></div><div className="flex flex-wrap gap-2">{selectedMembers.map((m) => <HapticButton key={m.id} onClick={() => toggle(i.id, m.id)} className={`rounded-full px-3 py-2 text-xs font-black ${i.memberIds.includes(m.id) ? "bg-mint-700 text-white" : "bg-neutral-100 dark:bg-neutral-800"}`}>{m.name}</HapticButton>)}</div></div>)}</div>}

        {selectedMembers.length > 0 && <div className="app-card mt-6 p-4"><h2 className="mb-2 text-[18px] font-black">Current split</h2>{selectedMembers.map((m) => <div key={m.id} className="flex justify-between py-1 text-sm"><span>{m.name}</span><b>{money(shares[m.id] || 0)}</b></div>)}</div>}
      </div>
      {sheet && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"><div className="w-full max-w-[430px] rounded-t-[26px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom))] dark:bg-neutral-900"><div className="mx-auto mb-5 h-1.5 w-14 rounded-full bg-mint-100" />{sheet === "split" && <><h2 className="text-[28px] font-black tracking-[-.04em]">How to split?</h2><div className="mt-5 grid grid-cols-3 rounded-[17px] bg-neutral-100 p-1 dark:bg-neutral-800">{(["EQUAL", "UNEQUAL", "PERCENT"] as const).map((v) => <HapticButton key={v} onClick={() => setSplitMode(v)} className={`rounded-[14px] py-3 text-[15px] font-black ${splitMode === v ? "bg-white text-mint-700 shadow dark:bg-neutral-950" : ""}`}>{v === "EQUAL" ? "Equally" : v === "UNEQUAL" ? "Unequally" : "By %"}</HapticButton>)}</div><p className="mt-5 text-center text-[16px] leading-6 text-neutral-600">{splitText}</p></>}{sheet === "group" && <><h2 className="text-[25px] font-black">Select group</h2><p className="mt-1 text-[15px] text-neutral-600">Choose which group this expense belongs to</p><div className="mt-5 space-y-2">{groups.length ? groups.map((g) => <HapticButton key={g.id} onClick={() => { setGroupId(g.id); setSheet(null); }} className="w-full justify-start rounded-[17px] bg-neutral-100 p-4 text-left text-[17px] font-black dark:bg-neutral-800">{g.name}</HapticButton>) : <p className="text-[16px] text-neutral-600">No groups yet. Create one first.</p>}</div></>}{sheet === "paid" && <><h2 className="text-[25px] font-black">Paid by</h2><p className="mt-4 text-[17px]">You</p></>}<HapticButton onClick={() => setSheet(null)} className="btn-primary mt-7 w-full text-lg">Done</HapticButton></div></div>}
    </main>
  );
}
