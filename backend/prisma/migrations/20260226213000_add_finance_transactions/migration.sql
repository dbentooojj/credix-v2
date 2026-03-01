-- Financial Intelligence SaaS: canonical transaction ledger for income and expenses.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceTransactionType') THEN
    CREATE TYPE "FinanceTransactionType" AS ENUM ('INCOME', 'EXPENSE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FinanceTransactionStatus') THEN
    CREATE TYPE "FinanceTransactionStatus" AS ENUM ('COMPLETED', 'SCHEDULED', 'PENDING');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "FinanceTransaction" (
  "id" SERIAL NOT NULL,
  "ownerUserId" INTEGER NOT NULL,
  "type" "FinanceTransactionType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "category" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "description" TEXT NOT NULL,
  "status" "FinanceTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'FinanceTransaction_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "FinanceTransaction"
    ADD CONSTRAINT "FinanceTransaction_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "FinanceTransaction_ownerUserId_idx" ON "FinanceTransaction"("ownerUserId");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_ownerUserId_type_date_idx" ON "FinanceTransaction"("ownerUserId", "type", "date");
CREATE INDEX IF NOT EXISTS "FinanceTransaction_ownerUserId_status_idx" ON "FinanceTransaction"("ownerUserId", "status");
