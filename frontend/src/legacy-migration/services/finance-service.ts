import { apiClient } from "./api-client";

export type FinanceTransactionType = "income" | "expense";
export type FinanceTransactionStatus = "completed" | "scheduled" | "pending";

export type FinanceTransaction = {
  id: string;
  type: FinanceTransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransactionStatus;
};

export type FinanceTransactionsResponse = {
  data: FinanceTransaction[];
};

export type UpsertFinanceTransactionPayload = {
  type: FinanceTransactionType;
  amount: number;
  category: string;
  date: string;
  description: string;
  status: FinanceTransactionStatus;
};

export type UpdateFinanceTransactionPayload = Partial<UpsertFinanceTransactionPayload>;

export type FinanceTransactionResponse = {
  data: FinanceTransaction;
};

export async function listFinanceTransactions(signal?: AbortSignal) {
  return apiClient.get<FinanceTransactionsResponse>("/api/finance/transactions", { signal });
}

export async function createFinanceTransaction(payload: UpsertFinanceTransactionPayload) {
  return apiClient.post<FinanceTransactionResponse, UpsertFinanceTransactionPayload>(
    "/api/finance/transactions",
    payload,
  );
}

export async function updateFinanceTransaction(id: string, payload: UpdateFinanceTransactionPayload) {
  return apiClient.patch<FinanceTransactionResponse, UpdateFinanceTransactionPayload>(
    `/api/finance/transactions/${encodeURIComponent(id)}`,
    payload,
  );
}

export async function deleteFinanceTransaction(id: string) {
  return apiClient.delete<void>(`/api/finance/transactions/${encodeURIComponent(id)}`);
}
