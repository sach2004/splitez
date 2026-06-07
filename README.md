# Splitwell AI

A mobile-first Splitwell-style Next.js application with Prisma, Neon PostgreSQL, NextAuth, guest mode, OpenAI receipt parsing, and Pusher-backed item claiming.

## Run

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Set `DATABASE_URL`, `NEXTAUTH_SECRET`, optional Google OAuth keys, OpenAI key, and optional Pusher keys.

## Important

This is a production-oriented starter, not a financial ledger audit system. Before real users, add authorization checks for every group and expense API route, rate limiting, upload storage, tests, and payment-grade reconciliation logic.
# splitez
