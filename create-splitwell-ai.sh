#!/usr/bin/env bash
set -euo pipefail
APP_NAME="splitwell-ai"
echo "Creating $APP_NAME"
npx create-next-app@latest "$APP_NAME" --ts --tailwind --eslint --app --src-dir=false --import-alias "@/*"
cd "$APP_NAME"
npm i @prisma/client prisma next-auth @next-auth/prisma-adapter bcryptjs next-themes openai pusher pusher-js lucide-react zod clsx tailwind-merge date-fns
npm i -D @types/bcryptjs
mkdir -p prisma
cat > .env.example <<'ENV'
DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-openssl-rand-base64-32"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o"
PUSHER_APP_ID=""
PUSHER_KEY=""
PUSHER_SECRET=""
PUSHER_CLUSTER=""
NEXT_PUBLIC_PUSHER_KEY=""
NEXT_PUBLIC_PUSHER_CLUSTER=""
ENV
cat > prisma/schema.prisma <<'PRISMA'
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

enum ExpenseCategory { FOOD TRAVEL HOTEL FUN GROCERIES FUEL UTILITIES OTHER }
enum SplitMode { EQUAL UNEQUAL PERCENT }
model User { id String @id @default(cuid()) name String? email String? @unique emailVerified DateTime? image String? passwordHash String? country String @default("India") currency String @default("INR") accounts Account[] sessions Session[] memberships Member[] createdGroups Group[] @relation("GroupCreator") paidExpenses Expense[] @relation("ExpensePayer") createdAt DateTime @default(now()) updatedAt DateTime @updatedAt }
model Account { id String @id @default(cuid()) userId String type String provider String providerAccountId String refresh_token String? @db.Text access_token String? @db.Text expires_at Int? token_type String? scope String? id_token String? @db.Text session_state String? user User @relation(fields:[userId], references:[id], onDelete:Cascade) @@unique([provider, providerAccountId]) }
model Session { id String @id @default(cuid()) sessionToken String @unique userId String expires DateTime user User @relation(fields:[userId], references:[id], onDelete:Cascade) }
model VerificationToken { identifier String token String @unique expires DateTime @@unique([identifier, token]) }
model Group { id String @id @default(cuid()) name String inviteCode String @unique @default(cuid()) currency String @default("INR") creatorId String? creator User? @relation("GroupCreator", fields:[creatorId], references:[id], onDelete:SetNull) members Member[] expenses Expense[] activities Activity[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt }
model Member { id String @id @default(cuid()) groupId String userId String? guestSessionId String? name String email String? isGuest Boolean @default(false) group Group @relation(fields:[groupId], references:[id], onDelete:Cascade) user User? @relation(fields:[userId], references:[id], onDelete:SetNull) claims ItemClaim[] paidExpenses Expense[] @relation("MemberPaidExpenses") createdAt DateTime @default(now()) @@unique([groupId, userId]) @@index([guestSessionId]) }
model Expense { id String @id @default(cuid()) groupId String description String amount Decimal @db.Decimal(10,2) category ExpenseCategory @default(FOOD) splitMode SplitMode @default(EQUAL) date DateTime @default(now()) payerUserId String? payerMemberId String? receiptUrl String? group Group @relation(fields:[groupId], references:[id], onDelete:Cascade) payerUser User? @relation("ExpensePayer", fields:[payerUserId], references:[id], onDelete:SetNull) payerMember Member? @relation("MemberPaidExpenses", fields:[payerMemberId], references:[id], onDelete:SetNull) items ReceiptItem[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt }
model ReceiptItem { id String @id @default(cuid()) expenseId String name String price Decimal @db.Decimal(10,2) expense Expense @relation(fields:[expenseId], references:[id], onDelete:Cascade) claims ItemClaim[] createdAt DateTime @default(now()) }
model ItemClaim { id String @id @default(cuid()) receiptItemId String memberId String claimedBySessionId String? item ReceiptItem @relation(fields:[receiptItemId], references:[id], onDelete:Cascade) member Member @relation(fields:[memberId], references:[id], onDelete:Cascade) createdAt DateTime @default(now()) @@unique([receiptItemId, memberId]) }
model Activity { id String @id @default(cuid()) groupId String? title String body String? group Group? @relation(fields:[groupId], references:[id], onDelete:Cascade) createdAt DateTime @default(now()) }
PRISMA
cat <<'DONE'
Base project and schema created.
Now copy the completed app files from the provided ZIP into this folder, then run:
  cp .env.example .env
  npx prisma db push
  npm run dev
DONE
