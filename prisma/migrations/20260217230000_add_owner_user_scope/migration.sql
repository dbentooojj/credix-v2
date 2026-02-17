-- Add owner scope to business tables to isolate data per user account.

ALTER TABLE "Client"
ADD COLUMN IF NOT EXISTS "ownerUserId" INTEGER;

ALTER TABLE "Loan"
ADD COLUMN IF NOT EXISTS "ownerUserId" INTEGER;

ALTER TABLE "Installment"
ADD COLUMN IF NOT EXISTS "ownerUserId" INTEGER;

ALTER TABLE "Payment"
ADD COLUMN IF NOT EXISTS "ownerUserId" INTEGER;

-- Backfill ownership for legacy rows.
UPDATE "Client"
SET "ownerUserId" = (
  SELECT id
  FROM "User"
  ORDER BY id
  LIMIT 1
)
WHERE "ownerUserId" IS NULL;

UPDATE "Loan" l
SET "ownerUserId" = c."ownerUserId"
FROM "Client" c
WHERE l."ownerUserId" IS NULL
  AND l."clientId" = c."id";

UPDATE "Installment" i
SET "ownerUserId" = c."ownerUserId"
FROM "Client" c
WHERE i."ownerUserId" IS NULL
  AND i."clientId" = c."id";

UPDATE "Payment" p
SET "ownerUserId" = l."ownerUserId"
FROM "Loan" l
WHERE p."ownerUserId" IS NULL
  AND p."loanId" = l."id";

ALTER TABLE "Client"
ALTER COLUMN "ownerUserId" SET NOT NULL;

ALTER TABLE "Loan"
ALTER COLUMN "ownerUserId" SET NOT NULL;

ALTER TABLE "Installment"
ALTER COLUMN "ownerUserId" SET NOT NULL;

ALTER TABLE "Payment"
ALTER COLUMN "ownerUserId" SET NOT NULL;

DROP INDEX IF EXISTS "Client_cpf_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Client_ownerUserId_cpf_key" ON "Client"("ownerUserId", "cpf");

CREATE INDEX IF NOT EXISTS "Client_ownerUserId_idx" ON "Client"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Loan_ownerUserId_idx" ON "Loan"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Installment_ownerUserId_idx" ON "Installment"("ownerUserId");
CREATE INDEX IF NOT EXISTS "Payment_ownerUserId_idx" ON "Payment"("ownerUserId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Client_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "Client"
    ADD CONSTRAINT "Client_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Loan_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "Loan"
    ADD CONSTRAINT "Loan_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Installment_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "Installment"
    ADD CONSTRAINT "Installment_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Payment_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "Payment"
    ADD CONSTRAINT "Payment_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;
