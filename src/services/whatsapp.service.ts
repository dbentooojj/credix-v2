import { env } from "../config/env";

type SendWhatsAppTextInput = {
  to: string;
  message: string;
};

function extractMetaError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const data = payload as {
    error?: {
      message?: unknown;
      error_user_msg?: unknown;
      code?: unknown;
      error_subcode?: unknown;
    };
  };

  const error = data.error;
  if (!error) return "";

  const details: string[] = [];

  if (typeof error.message === "string" && error.message.trim()) {
    details.push(error.message.trim());
  }

  if (typeof error.error_user_msg === "string" && error.error_user_msg.trim()) {
    details.push(error.error_user_msg.trim());
  }

  if (typeof error.code === "number" || typeof error.code === "string") {
    details.push(`code ${String(error.code)}`);
  }

  if (typeof error.error_subcode === "number" || typeof error.error_subcode === "string") {
    details.push(`subcode ${String(error.error_subcode)}`);
  }

  return details.join(" | ");
}

export function normalizePhoneForWhatsApp(rawPhone: string): string | null {
  const digitsOnly = String(rawPhone ?? "").replace(/\D/g, "");
  if (!digitsOnly) return null;

  const normalized = digitsOnly.startsWith("00") ? digitsOnly.slice(2) : digitsOnly;

  if (normalized.length < 10 || normalized.length > 15) {
    return null;
  }

  if (/^\d{10,11}$/.test(normalized)) {
    return `55${normalized}`;
  }

  return normalized;
}

export async function sendWhatsAppTextMessage(input: SendWhatsAppTextInput): Promise<{ messageId: string | null }> {
  if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
    throw new Error("WhatsApp API nao configurada no servidor");
  }

  const endpoint = `${env.WHATSAPP_GRAPH_BASE_URL}/${env.WHATSAPP_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: {
        body: input.message,
      },
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const detail = extractMetaError(payload);
    throw new Error(detail || `Falha HTTP ${response.status} no envio WhatsApp`);
  }

  const messageId = (() => {
    if (!payload || typeof payload !== "object") return null;
    const data = payload as { messages?: Array<{ id?: unknown }> };
    const firstMessageId = data.messages?.[0]?.id;
    if (typeof firstMessageId !== "string" || !firstMessageId.trim()) return null;
    return firstMessageId;
  })();

  return { messageId };
}
