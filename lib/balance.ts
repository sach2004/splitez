export type BMember = { id: string; name: string; userId: string | null };
export type BExpense = {
  amount: number;
  splitMode: string;
  payerUserId: string | null;
  items: { price: number; claims: { memberId: string }[] }[];
};

export type MemberBalance = { memberId: string; name: string; net: number };
export type Debt = { fromName: string; toName: string; amount: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

/** How much each member owes for a single expense. */
export function sharesFor(e: BExpense, members: BMember[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of members) out[m.id] = 0;

  if (e.splitMode === "EQUAL") {
    const each = e.amount / (members.length || 1);
    for (const m of members) out[m.id] = each;
  } else {
    for (const item of e.items) {
      const claimers = item.claims.map((c) => c.memberId);
      const each = item.price / (claimers.length || 1);
      for (const id of claimers) out[id] = (out[id] || 0) + each;
    }
  }
  return out;
}

function payerMemberId(e: BExpense, members: BMember[]): string | null {
  if (!e.payerUserId) return null;
  return members.find((m) => m.userId === e.payerUserId)?.id ?? null;
}

export function computeBalances(expenses: BExpense[], members: BMember[]) {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "Someone";

  const net: Record<string, number> = {};
  for (const m of members) net[m.id] = 0;
  const pair: Record<string, number> = {}; // `${debtor}|${creditor}` -> amount

  for (const e of expenses) {
    const shares = sharesFor(e, members);
    const payer = payerMemberId(e, members);
    if (payer) net[payer] += e.amount;

    for (const m of members) {
      const s = shares[m.id] || 0;
      if (!s) continue;
      net[m.id] -= s;
      if (payer && m.id !== payer) {
        const k = `${m.id}|${payer}`;
        pair[k] = (pair[k] || 0) + s;
      }
    }
  }

  const balances: MemberBalance[] = members.map((m) => ({ memberId: m.id, name: m.name, net: r2(net[m.id]) }));
  const debts: Debt[] = Object.entries(pair)
    .filter(([, v]) => v > 0.009)
    .map(([k, v]) => {
      const [from, to] = k.split("|");
      return { fromName: nameOf(from), toName: nameOf(to), amount: r2(v) };
    })
    .sort((a, b) => b.amount - a.amount);

  return { balances, debts };
}
