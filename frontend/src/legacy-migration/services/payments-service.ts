import { apiClient } from "./api-client";

export type PaymentMethod = "PIX" | "DINHEIRO" | "TRANSFERENCIA" | "CARTAO";

export type PaymentItem = {
  id: number;
  loanId: number;
  installmentId: number | null;
  debtorId: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  notes: string | null;
  createdAt: string;
};

export type PaymentsResponse = {
  data: PaymentItem[];
};

export type CreatePaymentPayload = {
  loanId: number;
  installmentId?: number;
  amount: number;
  paymentDate: string;
  method: PaymentMethod;
  notes?: string;
};

export type CreatePaymentResponse = {
  message: string;
  data: {
    id: number;
    loanId: number;
    installmentId: number | null;
    amount: number;
    paymentDate: string;
    method: PaymentMethod;
    notes: string | null;
  };
};

export type RevertPaymentResponse = {
  message: string;
  data: {
    installmentId: number;
    loanId: number;
    status: string;
  };
};

export type DeleteInstallmentResponse = {
  message: string;
  data: {
    installmentId: number;
    loanId: number;
    remainingInstallmentsCount: number;
    newLoanTotalAmount: number;
  };
};

export async function listPayments(loanId?: number, signal?: AbortSignal) {
  return apiClient.get<PaymentsResponse>("/api/payments", {
    query: loanId ? { loanId } : undefined,
    signal,
  });
}

export async function createPayment(payload: CreatePaymentPayload) {
  return apiClient.post<CreatePaymentResponse, CreatePaymentPayload>("/api/payments", payload);
}

export async function revertInstallmentPayment(installmentId: number) {
  return apiClient.post<RevertPaymentResponse>(`/api/payments/installments/${installmentId}/revert`);
}

export async function deleteInstallment(installmentId: number) {
  return apiClient.delete<DeleteInstallmentResponse>(`/api/payments/installments/${installmentId}`);
}
