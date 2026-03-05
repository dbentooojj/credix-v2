import "dotenv/config";
import { LoanStatus } from "@prisma/client";
import {
  LOAN_DISBURSEMENT_CATEGORY,
  buildLoanDisbursementDescription,
  deleteLoanDisbursementTransaction,
  upsertLoanDisbursementTransaction,
} from "../lib/installment-income-transaction";
import { toSafeNumber } from "../lib/numbers";
import { prisma } from "../lib/prisma";

type ExistingDisbursement = {
  id: number;
  ownerUserId: number;
  description: string;
};

function buildKey(ownerUserId: number, loanId: number): string {
  return `${ownerUserId}:${loanId}`;
}

function parseLoanIdFromDescription(description: string): number | null {
  const match = String(description).match(/#(\d+)\s*$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

function mapExistingRows(rows: ExistingDisbursement[]): Map<string, ExistingDisbursement[]> {
  const map = new Map<string, ExistingDisbursement[]>();
  for (const row of rows) {
    const loanId = parseLoanIdFromDescription(row.description);
    if (!loanId) continue;
    const key = buildKey(row.ownerUserId, loanId);
    const current = map.get(key) ?? [];
    current.push(row);
    map.set(key, current);
  }
  return map;
}

async function main() {
  const loans = await prisma.loan.findMany({
    select: {
      id: true,
      ownerUserId: true,
      principalAmount: true,
      startDate: true,
      status: true,
    },
  });

  const existingRows = await prisma.financeTransaction.findMany({
    where: {
      category: LOAN_DISBURSEMENT_CATEGORY,
    },
    select: {
      id: true,
      ownerUserId: true,
      description: true,
    },
  });

  const existingByLoanKey = mapExistingRows(existingRows);

  let created = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;

  for (const loan of loans) {
    const key = buildKey(loan.ownerUserId, loan.id);
    const existing = existingByLoanKey.get(key) ?? [];
    const description = buildLoanDisbursementDescription(loan.id);

    if (loan.status === LoanStatus.PENDENTE) {
      if (existing.length > 0) {
        await prisma.$transaction(async (tx) => {
          await deleteLoanDisbursementTransaction(tx, {
            ownerUserId: loan.ownerUserId,
            loanId: loan.id,
          });
        });
        removed += existing.length;
      } else {
        skipped += 1;
      }
      continue;
    }

    const amount = toSafeNumber(loan.principalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      skipped += 1;
      continue;
    }

    const hadExisting = existing.length > 0;

    await prisma.$transaction(async (tx) => {
      await upsertLoanDisbursementTransaction(tx, {
        ownerUserId: loan.ownerUserId,
        loanId: loan.id,
        amount,
        date: loan.startDate,
      });
    });

    if (hadExisting) {
      updated += 1;
    } else {
      created += 1;
    }

    if (existing.length > 1) {
      const duplicates = existing
        .slice(1)
        .map((item) => item.id);
      await prisma.financeTransaction.deleteMany({
        where: {
          id: { in: duplicates },
        },
      });
      removed += duplicates.length;
    }

    existingByLoanKey.set(key, [{
      id: existing[0]?.id ?? -1,
      ownerUserId: loan.ownerUserId,
      description,
    }]);
  }

  // Remove orphan disbursements that no longer have a corresponding loan.
  const validLoanKeys = new Set(loans.map((loan) => buildKey(loan.ownerUserId, loan.id)));
  const orphanTransactionIds: number[] = [];
  for (const row of existingRows) {
    const loanId = parseLoanIdFromDescription(row.description);
    if (!loanId) continue;
    const key = buildKey(row.ownerUserId, loanId);
    if (!validLoanKeys.has(key)) {
      orphanTransactionIds.push(row.id);
    }
  }

  if (orphanTransactionIds.length > 0) {
    await prisma.financeTransaction.deleteMany({
      where: {
        id: { in: orphanTransactionIds },
      },
    });
    removed += orphanTransactionIds.length;
  }

  console.log(`[loan-disbursement-backfill] loans=${loans.length}`);
  console.log(`[loan-disbursement-backfill] created=${created} updated=${updated} removed=${removed} skipped=${skipped}`);
}

void main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[loan-disbursement-backfill] Falha: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
