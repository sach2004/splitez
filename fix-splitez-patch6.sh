#!/usr/bin/env bash
# =============================================================================
# fix-splitez-patch6.sh  —  Run from project root
#
# Fixes: P2028 "Transaction already closed / timeout 5000 ms"
#
# WHY: an interactive prisma.$transaction(async tx => ...) holds ONE connection
# open across every await inside it. With ~16 receipt items × 3 claims each,
# and Neon being a remote serverless Postgres with network latency, the work
# took >5s — past the default interactive-transaction timeout — so Prisma
# aborted it.
#
# FIX: drop the interactive transaction. A single expense.create() with nested
# items/claims is ALREADY atomic (Prisma wraps nested writes in one implicit
# transaction). The activity log is a separate, non-blocking write.
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

[[ -f "package.json" ]] || { echo "Run from project root"; exit 1; }

# =============================================================================
# app/api/expenses/route.ts — single atomic create, no interactive transaction
# =============================================================================
info "Fixing app/api/expenses/route.ts (remove interactive transaction)..."
mkdir -p "app/api/expenses"
cat > "app/api/expenses/route.ts" << 'TS'
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ExpenseCategory, SplitMode } from "@prisma/client";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id || null;

    const body = await req.json();
    if (!body.groupId) {
      return NextResponse.json({ error: "Group required" }, { status: 400 });
    }

    const amount = Number(body.amount || 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
    }

    // Optional yyyy-mm-dd date
    let date: Date | undefined;
    if (body.date && typeof body.date === "string") {
      const d = new Date(body.date);
      if (!isNaN(d.getTime())) date = d;
    }

    // Only allow claims on members that belong to this group
    const groupMembers = await prisma.member.findMany({
      where: { groupId: body.groupId },
      select: { id: true },
    });
    const validMemberIds = new Set(groupMembers.map((m) => m.id));

    const description = body.description || "Expense";
    const splitMode = (body.splitMode || "EQUAL") as SplitMode;

    // SINGLE nested create — this is atomic by itself. Prisma wraps the expense
    // + all its items + all their claims in one implicit transaction. No
    // interactive $transaction, so there's no 5s connection-hold timeout.
    const expense = await prisma.expense.create({
      data: {
        groupId: body.groupId,
        description,
        amount,
        category: (body.category || "FOOD") as ExpenseCategory,
        splitMode,
        ...(date ? { date } : {}),
        payerUserId: userId,
        payerMemberId: body.payerMemberId || null,
        items: {
          create: (body.items || []).map(
            (item: { name: string; price: number; memberIds?: string[] }) => ({
              name: item.name,
              price: Number(item.price),
              claims: {
                create: (item.memberIds || [])
                  .filter((memberId: string) => validMemberIds.has(memberId))
                  .map((memberId: string) => ({
                    memberId,
                    claimedBySessionId: body.guestSessionId || null,
                  })),
              },
            })
          ),
        },
      },
      include: { items: { include: { claims: true } } },
    });

    // Activity log is a separate, NON-blocking write. If it fails (or is slow)
    // it must never break the expense that already saved successfully.
    prisma.activity
      .create({
        data: {
          groupId: body.groupId,
          title: `Added ${description}`,
          body: `${amount.toFixed(2)} split ${splitMode}`,
        },
      })
      .catch((e) => console.error("[expenses] activity log failed:", e));

    return NextResponse.json(expense);
  } catch (err: unknown) {
    console.error("[expenses] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save expense" },
      { status: 500 }
    );
  }
}
TS
ok "expenses API fixed"

# =============================================================================
# Done
# =============================================================================
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Patch 6 done — the timeout is gone.                           ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  WHY IT TIMED OUT:                                             ║${NC}"
echo -e "${GREEN}║   An interactive \$transaction holds one DB connection open     ║${NC}"
echo -e "${GREEN}║   across every await. ~16 items × 3 claims over a remote Neon  ║${NC}"
echo -e "${GREEN}║   DB took >5s → Prisma's default 5000ms timeout aborted it.    ║${NC}"
echo -e "${GREEN}║                                                                ║${NC}"
echo -e "${GREEN}║  THE FIX:                                                      ║${NC}"
echo -e "${GREEN}║   ✔ One expense.create() with nested items/claims —           ║${NC}"
echo -e "${GREEN}║     already atomic, no connection held open, no timeout.       ║${NC}"
echo -e "${GREEN}║   ✔ Activity log written separately, non-blocking, so a        ║${NC}"
echo -e "${GREEN}║     slow/failed log never breaks a saved expense.             ║${NC}"
echo -e "${GREEN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${GREEN}║  Restart:  npm run dev   then save the Goa bill again.        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
