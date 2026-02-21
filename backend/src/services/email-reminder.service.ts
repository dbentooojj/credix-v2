import { InstallmentStatus } from "@prisma/client";
import { env } from "../config/env";
import { getIsoTodayInTimeZone, normalizeTimeZone } from "../lib/date-time";
import { toSafeNumber } from "../lib/numbers";
import { prisma } from "../lib/prisma";
import { getSmtpConfigError, sendEmail } from "./email.service";

type DueTodayInstallment = {
  installmentId: number;
  installmentNumber: number;
  loanId: number;
  clientName: string;
  clientPhone: string | null;
  amount: number;
};

type SendDueTodayEmailOptions = {
  force?: boolean;
  targetDateIso?: string;
  recipients?: string[];
  timeZone?: string;
};

export type SendDueTodayEmailResult = {
  ok: boolean;
  skipped: boolean;
  message: string;
  targetDateIso: string;
  recipients: string[];
  dueCount: number;
  totalAmount: number;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateIso(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDate;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function parseRecipients(raw?: string): string[] {
  if (!raw) return [];
  const seen = new Set<string>();

  raw
    .split(/[;,]/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .forEach((value) => seen.add(value));

  return [...seen];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeWhatsAppPhone(rawPhone: string | null | undefined): string | null {
  const digits = String(rawPhone || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length > 11) return digits;
  return null;
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getEmailRecipients(override?: string[]): string[] {
  if (override && override.length > 0) {
    return override.map((item) => item.trim().toLowerCase()).filter(Boolean);
  }

  return parseRecipients(env.EMAIL_NOTIFY_TO);
}

async function fetchDueTodayInstallments(targetDateIso: string): Promise<DueTodayInstallment[]> {
  const dueDate = new Date(`${targetDateIso}T00:00:00Z`);

  const rows = await prisma.installment.findMany({
    where: {
      dueDate,
      status: { not: InstallmentStatus.PAGO },
    },
    orderBy: [
      { client: { name: "asc" } },
      { installmentNumber: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      loanId: true,
      installmentNumber: true,
      amount: true,
      client: {
        select: {
          name: true,
          phone: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    installmentId: row.id,
    installmentNumber: row.installmentNumber,
    loanId: row.loanId,
    clientName: row.client.name,
    clientPhone: row.client.phone,
    amount: toSafeNumber(row.amount),
  }));
}

function buildSubject(targetDateIso: string, dueCount: number, totalAmount: number): string {
  const dateLabel = formatDateIso(targetDateIso);
  if (dueCount === 0) {
    return `[Credix] Vencimentos de hoje (${dateLabel}): 0 parcela(s)`;
  }
  return `[Credix] Vencimentos de hoje (${dateLabel}): ${dueCount} parcela(s) - ${formatCurrency(totalAmount)}`;
}

function buildTextBody(items: DueTodayInstallment[], targetDateIso: string, totalAmount: number): string {
  if (items.length === 0) {
    return "Nenhuma parcela vence hoje.";
  }

  const dateLabel = formatDateIso(targetDateIso);
  const lines = items.map((item, index) => {
    const whatsappPhone = normalizeWhatsAppPhone(item.clientPhone);
    const whatsappLink = whatsappPhone ? `https://wa.me/${whatsappPhone}` : "-";
    return `${index + 1}. ${item.clientName} | #${item.installmentNumber} | #${item.loanId} | ${formatCurrency(item.amount)} | ${whatsappLink}`;
  });

  return [
    `Parcelas para hoje (${dateLabel})`,
    `Total de parcelas: ${items.length} | Valor total: ${formatCurrency(totalAmount)}`,
    "",
    "Cliente | Parcela | Emprestimo | Valor | Telefone (WhatsApp)",
    ...lines,
    "",
    "Mensagem automatica do Credix.",
  ].join("\n");
}

function buildHtmlBody(items: DueTodayInstallment[], targetDateIso: string, totalAmount: number): string {
  if (items.length === 0) {
    return `
      <div style="font-family:Arial,sans-serif;color:#111827;">
        <p style="margin:0;">Nenhuma parcela vence hoje.</p>
      </div>
    `;
  }

  const dateLabel = formatDateIso(targetDateIso);
  const rows = items.map((item) => {
    const whatsappPhone = normalizeWhatsAppPhone(item.clientPhone);
    const displayPhone = item.clientPhone ? escapeHtml(item.clientPhone) : "-";
    const phoneCell = whatsappPhone
      ? `<a href="https://wa.me/${whatsappPhone}" target="_blank" rel="noopener noreferrer">${displayPhone}</a>`
      : displayPhone;

    return `
      <tr>
        <td style="padding:10px;border:1px solid #e5e7eb;">${escapeHtml(item.clientName)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">#${item.installmentNumber}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">#${item.loanId}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.amount)}</td>
        <td style="padding:10px;border:1px solid #e5e7eb;">${phoneCell}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.4;">
      <h1 style="margin:0 0 10px;font-size:22px;">Parcelas para hoje (${dateLabel})</h1>
      <p style="margin:0 0 14px;font-size:14px;">
        Total de parcelas: <strong>${items.length}</strong> | Valor total: <strong>${formatCurrency(totalAmount)}</strong>
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;background:#f8fafc;">Cliente</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:center;background:#f8fafc;">Parcela</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:center;background:#f8fafc;">Emprestimo</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Valor</th>
            <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;background:#f8fafc;">Telefone (WhatsApp)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin:14px 0 0;font-size:12px;color:#6b7280;">Mensagem automatica do Credix.</p>
    </div>
  `;
}

export async function sendDueTodayInstallmentsEmail(
  options: SendDueTodayEmailOptions = {},
): Promise<SendDueTodayEmailResult> {
  const force = Boolean(options.force);
  if (!env.EMAIL_NOTIFY_ENABLED && !force) {
    return {
      ok: true,
      skipped: true,
      message: "Notificacao por e-mail desativada no .env",
      targetDateIso: "",
      recipients: [],
      dueCount: 0,
      totalAmount: 0,
    };
  }

  const timeZone = normalizeTimeZone(options.timeZone ?? env.EMAIL_NOTIFY_TZ);
  const todayIso = getIsoTodayInTimeZone(timeZone);
  const targetDateIso = (() => {
    const explicit = options.targetDateIso?.trim();
    if (!explicit) return todayIso;
    return isIsoDate(explicit) ? explicit : "";
  })();

  if (!targetDateIso) {
    return {
      ok: false,
      skipped: true,
      message: "Data alvo invalida. Use YYYY-MM-DD",
      targetDateIso: "",
      recipients: [],
      dueCount: 0,
      totalAmount: 0,
    };
  }

  const dueItems = await fetchDueTodayInstallments(targetDateIso);
  const totalAmount = dueItems.reduce((sum, item) => sum + item.amount, 0);
  const recipients = getEmailRecipients(options.recipients);

  if (recipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      message: "EMAIL_NOTIFY_TO nao configurado",
      targetDateIso,
      recipients,
      dueCount: dueItems.length,
      totalAmount,
    };
  }

  const smtpError = getSmtpConfigError();
  if (smtpError) {
    return {
      ok: false,
      skipped: true,
      message: smtpError,
      targetDateIso,
      recipients,
      dueCount: dueItems.length,
      totalAmount,
    };
  }

  await sendEmail({
    to: recipients,
    subject: buildSubject(targetDateIso, dueItems.length, totalAmount),
    text: buildTextBody(dueItems, targetDateIso, totalAmount),
    html: buildHtmlBody(dueItems, targetDateIso, totalAmount),
  });

  return {
    ok: true,
    skipped: false,
    message: `E-mail enviado para ${recipients.length} destinatario(s) com ${dueItems.length} parcela(s)`,
    targetDateIso,
    recipients,
    dueCount: dueItems.length,
    totalAmount,
  };
}

// Mantido por compatibilidade com imports antigos.
export type SendDueTomorrowEmailResult = SendDueTodayEmailResult;

// Mantido por compatibilidade com imports antigos.
export async function sendDueTomorrowInstallmentsEmail(
  options: SendDueTodayEmailOptions = {},
): Promise<SendDueTodayEmailResult> {
  return sendDueTodayInstallmentsEmail(options);
}
