import type { FinanceTransaction } from "./finance-store";
import { getDatabasePool } from "./database";

type FinanceTransactionRecord = {
  id: string;
  type: FinanceTransaction["type"];
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransaction["status"];
};

function mapFinanceTransactionRow(row: FinanceTransactionRecord): FinanceTransaction {
  return {
    id: String(row.id),
    type: row.type,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    description: row.description,
    status: row.status,
  };
}

function toTransactionId(id: string) {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function listFinanceTransactions() {
  const result = await getDatabasePool().query<FinanceTransactionRecord>(`
    SELECT
      id::text AS id,
      type,
      amount::double precision AS amount,
      category,
      "date" AS date,
      description,
      status
    FROM finance_transactions
    ORDER BY "date" DESC, id DESC
  `);

  return result.rows.map(mapFinanceTransactionRow);
}

export async function createFinanceTransaction(payload: Omit<FinanceTransaction, "id">) {
  const result = await getDatabasePool().query<FinanceTransactionRecord>(
    `
      INSERT INTO finance_transactions (type, amount, category, "date", description, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        id::text AS id,
        type,
        amount::double precision AS amount,
        category,
        "date" AS date,
        description,
        status
    `,
    [
      payload.type,
      payload.amount,
      payload.category,
      payload.date,
      payload.description,
      payload.status,
    ],
  );

  return mapFinanceTransactionRow(result.rows[0]);
}

export async function updateFinanceTransaction(
  id: string,
  payload: Partial<Omit<FinanceTransaction, "id">>,
) {
  const transactionId = toTransactionId(id);
  if (!transactionId) {
    return null;
  }

  const updates: string[] = [];
  const values: Array<string | number> = [];

  if (payload.type !== undefined) {
    updates.push(`type = $${values.length + 1}`);
    values.push(payload.type);
  }
  if (payload.amount !== undefined) {
    updates.push(`amount = $${values.length + 1}`);
    values.push(payload.amount);
  }
  if (payload.category !== undefined) {
    updates.push(`category = $${values.length + 1}`);
    values.push(payload.category);
  }
  if (payload.date !== undefined) {
    updates.push(`"date" = $${values.length + 1}`);
    values.push(payload.date);
  }
  if (payload.description !== undefined) {
    updates.push(`description = $${values.length + 1}`);
    values.push(payload.description);
  }
  if (payload.status !== undefined) {
    updates.push(`status = $${values.length + 1}`);
    values.push(payload.status);
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(transactionId);

  const result = await getDatabasePool().query<FinanceTransactionRecord>(
    `
      UPDATE finance_transactions
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id::text AS id,
        type,
        amount::double precision AS amount,
        category,
        "date" AS date,
        description,
        status
    `,
    values,
  );

  if (result.rows.length === 0) {
    return null;
  }

  return mapFinanceTransactionRow(result.rows[0]);
}

export async function deleteFinanceTransaction(id: string) {
  const transactionId = toTransactionId(id);
  if (!transactionId) {
    return false;
  }

  const result = await getDatabasePool().query(
    "DELETE FROM finance_transactions WHERE id = $1",
    [transactionId],
  );

  return (result.rowCount || 0) > 0;
}
