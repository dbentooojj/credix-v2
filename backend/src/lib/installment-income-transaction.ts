import {
  FinanceTransactionStatus,
  FinanceTransactionType,
  type Prisma,
} from "@prisma/client";

export const CASH_ADJUSTMENT_CATEGORY = "Ajuste de caixa";
export const INSTALLMENT_PAYMENT_CATEGORY = "Recebimento de parcela";

export function buildInstallmentIncomeDescription(installmentId: number, loanId: number): string {
  return `Recebimento da parcela #${installmentId} do emprestimo #${loanId}`;
}

type InstallmentIncomeTransactionInput = {
  ownerUserId: number;
  installmentId: number;
  loanId: number;
  amount: number;
  date: Date;
};

export async function upsertInstallmentIncomeTransaction(
  tx: Prisma.TransactionClient,
  input: InstallmentIncomeTransactionInput,
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const description = buildInstallmentIncomeDescription(input.installmentId, input.loanId);

  const existing = await tx.financeTransaction.findFirst({
    where: {
      ownerUserId: input.ownerUserId,
      category: INSTALLMENT_PAYMENT_CATEGORY,
      description,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await tx.financeTransaction.update({
      where: { id: existing.id },
      data: {
        ownerUserId: input.ownerUserId,
        type: FinanceTransactionType.INCOME,
        amount,
        category: INSTALLMENT_PAYMENT_CATEGORY,
        date: input.date,
        description,
        status: FinanceTransactionStatus.COMPLETED,
      },
    });
    return;
  }

  await tx.financeTransaction.create({
    data: {
      ownerUserId: input.ownerUserId,
      type: FinanceTransactionType.INCOME,
      amount,
      category: INSTALLMENT_PAYMENT_CATEGORY,
      date: input.date,
      description,
      status: FinanceTransactionStatus.COMPLETED,
    },
  });
}

export async function deleteInstallmentIncomeTransaction(
  tx: Prisma.TransactionClient,
  params: { ownerUserId: number; installmentId: number; loanId: number },
) {
  const description = buildInstallmentIncomeDescription(params.installmentId, params.loanId);
  await tx.financeTransaction.deleteMany({
    where: {
      ownerUserId: params.ownerUserId,
      category: INSTALLMENT_PAYMENT_CATEGORY,
      description,
    },
  });
}
