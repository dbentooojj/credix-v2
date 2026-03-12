import { apiClient } from "./api-client";

export type WhatsAppBatchRecipient = {
  phone: string;
  message: string;
  installmentIds: number[];
  debtorId?: number;
};

export type WhatsAppBatchPayload = {
  recipients: WhatsAppBatchRecipient[];
};

export type WhatsAppBatchResult = {
  phone: string;
  ok: boolean;
  messageId: string | null;
  error: string | null;
  debtorId: number | null;
  installmentIds: number[];
};

export type WhatsAppBatchResponse = {
  message: string;
  summary: {
    total: number;
    sent: number;
    failed: number;
  };
  results: WhatsAppBatchResult[];
};

export async function sendWhatsAppBatch(payload: WhatsAppBatchPayload) {
  return apiClient.post<WhatsAppBatchResponse, WhatsAppBatchPayload>("/api/notifications/whatsapp/batch", payload);
}

