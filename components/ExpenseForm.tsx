"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Car, Clapperboard, Fuel, Hotel, ImagePlus,
  ReceiptText, ShoppingCart, Utensils, Zap, Shapes, X, ChevronDown, Check,
} from "lucide-react";
import { HapticButton } from "@/components/HapticButton";
import { getGuestSessionId } from "@/lib/guest";
import { uuid } from "@/lib/uuid";
import { money, initials } from "@/lib/utils";

type Group  = { id: string; name: string; members: { id: string; name: string }[] };
type Member = { id: string; name: string };
type Item   = { id: string; name: string; price: number; memberIds: string[] };

const cats = [
  ["FOOD",      "Food",      Utensils],
  ["TRAVEL",    "Travel",    Car],
  ["HOTEL",     "Hotel",     Hotel],
  ["FUN",       "Fun",       Clapperboard],
  ["GROCERIES", "Groceries", ShoppingCart],
  ["FUEL",      "Fuel",      Fuel],
  ["UTILITIES", "Utilities", Zap],
  ["OTHER",     "Other",     Shapes],
] as const;

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-black uppercase tracking-[.12em] text-[var(--muted)]">
      {children}
    </p>
  );
}

function PillBtn({
  onClick, children, className = "",
}: { onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <HapticButton
      onClick={onClick}
      className={`flex h-[38px] items-center gap-1.5 rounded-[12px] px-3.5 text-[14px] font-black ${className}`}
    >
      {children}
    </HapticButton>
  );
}

export default function ExpenseForm({ groups }: { groups: Group[] }) {
  const params  = useSearchParams();
  const router  = useRouter();
  const initial = params.get("groupId") || groups[0]?.id || "";

  const [groupId,     setGroupId]     = useState(initial);
  const [amount,      setAmount]      = useState("");
  const [description, setDescription] = useState("");
  const [category,    setCategory]    = useState("FOOD");
  const [splitMode,   setSplitMode]   = useState<"EQUAL" | "UNEQUAL">("EQUAL");
  const [date,        setDate]        = useState(() => new Date().toISOString().slice(0, 10));
  const [sheet,       setSheet]       = useState<"group" | "members" | "split" | "paid" | null>(null);
  const [items,       setItems]       = useState<Item[]>([]);
  const [loadingAi,   setLoadingAi]   = useState(false);
  const [saving,      setSaving]      = useState(false);

  const group       = groups.find((g) => g.id === groupId);
  const allMembers: Member[] = useMemo(() => group?.members || [], [group]);

  // Which members are part of THIS split — defaults to everyone in the group
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  useEffect(() => {
    setIncludedIds(allMembers.map((m) => m.id));
  }, [allMembers]);

  const selectedMembers = allMembers.filter((m) => includedIds.includes(m.id));

  // When items exist (By item), total is the sum of items
  useEffect(() => {
    if (splitMode === "UNEQUAL" && items.length > 0) {
      const total = items.reduce((s, i) => s + i.price, 0);
      if (total > 0) setAmount(total.toFixed(2));
    }
  }, [items, splitMode]);

  const splitLabel = splitMode === "EQUAL" ? "Equally" : "By item";

  function toggleIncluded(id: string) {
    setIncludedIds((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));
  }

  async function parseReceipt(file: File) {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res  = await fetch("/api/receipt/parse", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data?.error || `Receipt parsing failed (${res.status})`);
        return;
      }
      setItems(
        (data.items || []).map((x: { name?: string; price?: number }, i: number) => ({
          id: uuid(),
          name: x.name || `Item ${i + 1}`,
          price: Number(x.price || 0),
          memberIds: [...includedIds], // default everyone in the split
        }))
      );
      setSplitMode("UNEQUAL");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Receipt parsing failed");
    } finally {
      setLoadingAi(false);
    }
  }

  function setAll(itemId: string, all: boolean) {
    setItems((v) =>
      v.map((i) => (i.id === itemId ? { ...i, memberIds: all ? [...includedIds] : [] } : i))
    );
  }
  function toggle(itemId: string, memberId: string) {
    setItems((v) =>
      v.map((i) =>
        i.id === itemId
          ? {
              ...i,
              memberIds: i.memberIds.includes(memberId)
                ? i.memberIds.filter((x) => x !== memberId)
                : [...i.memberIds, memberId],
            }
          : i
      )
    );
  }

  const shares = useMemo(() => {
    const out: Record<string, number> = {};
    for (const m of selectedMembers) out[m.id] = 0;
    if (splitMode === "EQUAL") {
      const each = Number(amount || 0) / (selectedMembers.length || 1);
      for (const m of selectedMembers) out[m.id] = each;
    } else {
      for (const i of items) {
        const sharers = i.memberIds.filter((id) => includedIds.includes(id));
        const each = i.price / (sharers.length || 1);
        for (const id of sharers) out[id] = (out[id] || 0) + each;
      }
    }
    return out;
  }, [amount, items, selectedMembers, splitMode, includedIds]);

  async function save() {
    if (saving) return;
    if (!groupId) return alert("Select a group first");
    if (!(Number(amount) > 0)) return alert("Enter an amount greater than zero");
    if (selectedMembers.length === 0) return alert("Pick at least one member to split with");
    setSaving(true);
    try {
      // Only send items whose member set is limited to included members
      const cleanItems = items.map((i) => ({
        ...i,
        memberIds: i.memberIds.filter((id) => includedIds.includes(id)),
      }));
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          description: description || "Expense",
          amount: Number(amount),
          category,
          splitMode,
          date,
          guestSessionId: getGuestSessionId(),
          items: splitMode === "UNEQUAL" ? cleanItems : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      router.push(`/groups/${groupId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="form-content">

        {/* Top bar */}
        <div className="flex items-center gap-2">
          <HapticButton
            onClick={() => router.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--soft)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </HapticButton>
          <h1 className="flex-1 text-[19px] font-black tracking-tight">Add expense</h1>
          <PillBtn onClick={() => setSheet("group")} className="max-w-[110px] bg-red-50 text-red-700 dark:bg-red-950/30">
            <span className="truncate">{group?.name || "Pick group"}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </PillBtn>
          <HapticButton onClick={save} loading={saving} loadingText="Saving" spinnerDark className="text-[15px] font-black text-mint-700">
            Save
          </HapticButton>
        </div>

        {/* Split BETWEEN — now opens the MEMBERS picker */}
        <div className="mt-6 flex items-center gap-2.5 text-[14px] text-[var(--muted)]">
          <span>Split between</span>
          <PillBtn onClick={() => setSheet("members")} className="bg-[var(--soft)] text-[var(--foreground)]">
            <span>
              {selectedMembers.length
                ? `${selectedMembers.length} member${selectedMembers.length !== 1 ? "s" : ""}`
                : "Pick members"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0" />
          </PillBtn>
        </div>

        {/* Amount */}
        <div className="mt-6">
          <Label>Amount</Label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            disabled={splitMode === "UNEQUAL" && items.length > 0}
            className="input-field h-[62px] px-5 text-[34px] font-semibold tracking-tight disabled:opacity-70"
          />
          {splitMode === "UNEQUAL" && items.length > 0 && (
            <p className="mt-1.5 text-[12px] text-[var(--muted)]">Total is calculated from the items below.</p>
          )}
        </div>

        {/* Description */}
        <div className="mt-4">
          <Label>Description</Label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What was this for?"
            className="input-field h-[50px] px-4 text-[15px]"
          />
        </div>

        {/* Paid by / Split */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <Label>Paid by</Label>
            <PillBtn onClick={() => setSheet("paid")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]">
              <span>You</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </PillBtn>
          </div>
          <div>
            <Label>Split</Label>
            <PillBtn onClick={() => setSheet("split")} className="w-full justify-between bg-[var(--soft)] text-[var(--foreground)]">
              <span>{splitLabel}</span><ChevronDown className="h-3.5 w-3.5 shrink-0" />
            </PillBtn>
          </div>
        </div>

        {/* Date */}
        <div className="mt-4">
          <Label>Date</Label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input-field h-[50px] px-4 text-[15px]" />
        </div>

        {/* Category */}
        <div className="mt-4">
          <Label>Category</Label>
          <div className="grid grid-cols-4 gap-2">
            {cats.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setCategory(id)}
                className={[
                  "tap-scale flex h-[68px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[11px] font-black",
                  category === id ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" : "bg-[var(--soft)] text-[var(--muted)]",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Receipt */}
        <div className="app-card mt-5 p-4">
          <div className="mb-3 flex items-center gap-2 text-[14px] font-black">
            <ReceiptText className="h-4 w-4 text-mint-600" />Or scan the bill (optional)
          </div>
          <label
            className={[
              "tap-scale flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[13px] border border-[var(--line)] bg-[var(--soft)] text-[14px] font-black text-mint-700",
              loadingAi ? "pointer-events-none opacity-60" : "",
            ].join(" ")}
          >
            {loadingAi ? (<><span className="spinner spinner-dark" />Scanning…</>) : (<><ImagePlus className="h-4 w-4" />Upload bill image</>)}
            <input type="file" accept="image/*" hidden disabled={loadingAi} onChange={(e) => e.target.files?.[0] && parseReceipt(e.target.files[0])} />
          </label>
          <p className="mt-2 text-[11px] text-[var(--muted)]">We&apos;ll read the items so you can assign them per person.</p>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="mt-5 space-y-2">
            <h2 className="text-[19px] font-black tracking-tight">Items — tap who shares each</h2>
            {items.map((i) => (
              <div key={i.id} className="app-card p-4">
                <div className="flex items-start justify-between gap-3 text-[14px] font-black">
                  <span>{i.name}</span><span className="shrink-0">{money(i.price)}</span>
                </div>
                <div className="my-2 flex gap-2">
                  <button onClick={() => setAll(i.id, true)} className="tap-scale rounded-full bg-mint-50 px-3 py-1.5 text-[11px] font-black text-mint-700">All</button>
                  <button onClick={() => setAll(i.id, false)} className="tap-scale rounded-full bg-[var(--soft)] px-3 py-1.5 text-[11px] font-black text-[var(--muted)]">None</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMembers.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => toggle(i.id, m.id)}
                      className={[
                        "tap-scale rounded-full px-3 py-1.5 text-[11px] font-black",
                        i.memberIds.includes(m.id) ? "bg-mint-700 text-white" : "bg-[var(--soft)] text-[var(--muted)]",
                      ].join(" ")}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview */}
        {selectedMembers.length > 0 && (
          <div className="app-card mt-4 p-4">
            <h2 className="mb-2 text-[15px] font-black">Who owes what</h2>
            {selectedMembers.map((m) => (
              <div key={m.id} className="flex justify-between border-b border-[var(--line)] py-2 text-[13px] last:border-0">
                <span className="text-[var(--muted)]">{m.name}</span><b>{money(shares[m.id] || 0)}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sheets */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55" onClick={() => setSheet(null)}>
          <div
            className="w-full max-w-[430px] rounded-t-[22px] bg-[var(--card)] p-5 pb-[calc(20px+env(safe-area-inset-bottom))] shadow-[0_-8px_40px_rgba(0,0,0,.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-[var(--line)]" />

            {/* MEMBERS picker */}
            {sheet === "members" && (
              <>
                <h2 className="text-[20px] font-black">Split between</h2>
                <p className="mt-1 text-[13px] text-[var(--muted)]">Tap to include / exclude people in this expense</p>
                <div className="mt-4 space-y-2">
                  {allMembers.length ? (
                    allMembers.map((m) => {
                      const on = includedIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => toggleIncluded(m.id)}
                          className={[
                            "tap-scale flex w-full items-center gap-3 rounded-[14px] px-3 py-3 text-left",
                            on ? "bg-mint-50 dark:bg-mint-900/20" : "bg-[var(--soft)]",
                          ].join(" ")}
                        >
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--card)] text-[13px] font-black text-mint-700">
                            {initials(m.name)}
                          </span>
                          <span className="flex-1 text-[15px] font-black">{m.name}</span>
                          <span
                            className={[
                              "grid h-6 w-6 place-items-center rounded-full border-2",
                              on ? "border-mint-600 bg-mint-600 text-white" : "border-[var(--line)]",
                            ].join(" ")}
                          >
                            {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <p className="text-[13px] text-[var(--muted)]">
                      No members in this group yet. Add members or share the invite link first.
                    </p>
                  )}
                </div>
              </>
            )}

            {/* SPLIT mode */}
            {sheet === "split" && (
              <>
                <h2 className="text-[22px] font-black tracking-tight">How to split?</h2>
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-[14px] bg-[var(--soft)] p-1">
                  {([["EQUAL", "Equally"], ["UNEQUAL", "By item"]] as const).map(([v, lbl]) => (
                    <button
                      key={v}
                      onClick={() => setSplitMode(v)}
                      className={[
                        "tap-scale rounded-[11px] py-2.5 text-[13px] font-black",
                        splitMode === v ? "bg-[var(--card)] text-mint-700 shadow-sm" : "text-[var(--muted)]",
                      ].join(" ")}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-center text-[13px] leading-5 text-[var(--muted)]">
                  {splitMode === "EQUAL"
                    ? `Split equally among ${selectedMembers.length} people — no item picking needed.`
                    : "Assign each item to the people who shared it."}
                </p>
              </>
            )}

            {/* GROUP picker */}
            {sheet === "group" && (
              <>
                <h2 className="text-[20px] font-black">Select group</h2>
                <div className="mt-4 space-y-2">
                  {groups.length ? (
                    groups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => { setGroupId(g.id); setItems([]); setSheet(null); }}
                        className={[
                          "tap-scale w-full rounded-[13px] px-4 py-3 text-left text-[14px] font-black",
                          g.id === groupId ? "bg-mint-50 text-mint-700 dark:bg-mint-900/20" : "bg-[var(--soft)] text-[var(--foreground)]",
                        ].join(" ")}
                      >
                        {g.name}
                      </button>
                    ))
                  ) : (
                    <p className="text-[13px] text-[var(--muted)]">No groups yet. Create one first.</p>
                  )}
                </div>
              </>
            )}

            {/* PAID BY */}
            {sheet === "paid" && (
              <>
                <h2 className="text-[20px] font-black">Paid by</h2>
                <div className="mt-3 rounded-[13px] bg-mint-50 px-4 py-3 dark:bg-mint-900/20">
                  <p className="text-[14px] font-black text-mint-700">You</p>
                </div>
              </>
            )}

            <button onClick={() => setSheet(null)} className="btn-primary tap-scale mt-5 w-full text-[14px]">Done</button>
          </div>
        </div>
      )}
    </main>
  );
}
