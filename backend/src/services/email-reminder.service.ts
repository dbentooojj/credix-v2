import { InstallmentStatus } from "@prisma/client";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";
import {
  getHourMinuteInTimeZone,
  getIsoTodayInTimeZone,
  normalizeTimeZone,
} from "../lib/date-time";
import { toSafeNumber } from "../lib/numbers";
import { prisma } from "../lib/prisma";

type DueTomorrowInstallment = {
  installmentId: number;
  installmentNumber: number;
  loanId: number;
  debtorName: string;
  debtorPhone: string | null;
  dueDateIso: string;
  amount: number;
};

type SendDueTomorrowEmailOptions = {
  force?: boolean;
  targetDateIso?: string;
  recipients?: string[];
  timeZone?: string;
};

export type SendDueTomorrowEmailResult = {
  ok: boolean;
  skipped: boolean;
  message: string;
  targetDateIso: string;
  recipients: string[];
  dueCount: number;
  totalAmount: number;
};

const SCHEDULER_TICK_MS = 30_000;

let schedulerTimer: NodeJS.Timeout | null = null;
let schedulerBusy = false;
let schedulerLastRunDate: string | null = null;
let cachedTransporter: Transporter | null = null;

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

function extractEmail(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const angleMatch = value.match(/<([^<>]+)>/);
  const candidate = (angleMatch?.[1] || value).replace(/^mailto:/i, "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;

  return candidate;
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

  const configured = parseRecipients(env.EMAIL_NOTIFY_TO);
  const isLegacyPlaceholder = configured.length === 1 && configured[0] === "usecredix@gmail.com";
  if (configured.length > 0 && !isLegacyPlaceholder) return configured;

  const fallbackCandidates = [
    env.SMTP_USER,
    extractEmail(env.SMTP_FROM) || undefined,
    process.env.ADMIN_EMAIL?.trim(),
  ];

  for (const candidate of fallbackCandidates) {
    const parsed = parseRecipients(candidate);
    if (parsed.length > 0) return parsed;
  }

  return [];
}

function smtpConfigErrorMessage(): string | null {
  if (!env.SMTP_HOST) return "SMTP_HOST nao configurado";
  if (!env.SMTP_FROM) return "SMTP_FROM nao configurado";
  if ((env.SMTP_USER && !env.SMTP_PASS) || (!env.SMTP_USER && env.SMTP_PASS)) {
    return "Defina SMTP_USER e SMTP_PASS juntos, ou deixe ambos vazios";
  }
  return null;
}

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const smtpError = smtpConfigErrorMessage();
  if (smtpError) {
    throw new Error(smtpError);
  }

  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
  });

  return cachedTransporter;
}

async function fetchDueTomorrowInstallments(targetDateIso: string): Promise<DueTomorrowInstallment[]> {
  const dueDate = new Date(`${targetDateIso}T00:00:00Z`);

  const rows = await prisma.installment.findMany({
    where: {
      dueDate,
      status: { not: InstallmentStatus.PAGO },
      payments: { none: {} },
    },
    orderBy: [
      { dueDate: "asc" },
      { client: { name: "asc" } },
      { installmentNumber: "asc" },
    ],
    select: {
      id: true,
      loanId: true,
      installmentNumber: true,
      dueDate: true,
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
    debtorName: row.client.name,
    debtorPhone: row.client.phone,
    dueDateIso: row.dueDate.toISOString().slice(0, 10),
    amount: toSafeNumber(row.amount),
  }));
}

function buildSubject(targetDateIso: string, dueCount: number, totalAmount: number): string {
  const dateLabel = formatDateIso(targetDateIso);
  return `[Credix] Vencimentos do dia (${dateLabel}): ${dueCount} parcela(s) - ${formatCurrency(totalAmount)}`;
}

function buildTextBody(items: DueTomorrowInstallment[], targetDateIso: string, totalAmount: number): string {
  const dateLabel = formatDateIso(targetDateIso);
  const lines = items.map((item, index) => {
    const debtorPhone = item.debtorPhone ? ` | WhatsApp: ${item.debtorPhone}` : " | WhatsApp: nao informado";
    return `${index + 1}. ${item.debtorName} | Parcela #${item.installmentNumber} | Emprestimo #${item.loanId} | Valor ${formatCurrency(item.amount)}${debtorPhone}`;
  });

  return [
    `Resumo de parcelas com vencimento em ${dateLabel}.`,
    "",
    `Total de parcelas: ${items.length}`,
    `Valor total: ${formatCurrency(totalAmount)}`,
    "",
    ...lines,
    "",
    "Mensagem automatica do Credix.",
  ].join("\n");
}

function buildHtmlBody(items: DueTomorrowInstallment[], targetDateIso: string, totalAmount: number): string {
  const dateLabel = formatDateIso(targetDateIso);
  const rows = items.map((item) => {
    const whatsappPhone = normalizeWhatsAppPhone(item.debtorPhone);
    const phoneCell = whatsappPhone
      ? `<a href="https://wa.me/${whatsappPhone}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.debtorPhone || whatsappPhone)}</a>`
      : (item.debtorPhone ? escapeHtml(item.debtorPhone) : "-");
    return `
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">${escapeHtml(item.debtorName)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">#${item.installmentNumber}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:center;">#${item.loanId}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.amount)}</td>
        <td style="padding:8px;border:1px solid #e5e7eb;">${phoneCell}</td>
      </tr>
    `;
  }).join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;">
      <h2 style="margin:0 0 8px;">Parcelas com vencimento em ${dateLabel}</h2>
      <p style="margin:0 0 12px;">Total de parcelas: <strong>${items.length}</strong> | Valor total: <strong>${formatCurrency(totalAmount)}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;background:#f9fafb;">Cliente</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;background:#f9fafb;">Parcela</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:center;background:#f9fafb;">Emprestimo</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;background:#f9fafb;">Valor</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;background:#f9fafb;">Telefone (WhatsApp)</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top:12px;color:#6b7280;font-size:12px;">Mensagem automatica do Credix.</p>
    </div>
  `;
}

export async function sendDueTomorrowInstallmentsEmail(
  options: SendDueTomorrowEmailOptions = {},
): Promise<SendDueTomorrowEmailResult> {
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

  const recipients = getEmailRecipients(options.recipients);
  if (recipients.length === 0) {
    return {
      ok: false,
      skipped: true,
      message: "EMAIL_NOTIFY_TO nao configurado",
      targetDateIso,
      recipients,
      dueCount: 0,
      totalAmount: 0,
    };
  }

  const smtpError = smtpConfigErrorMessage();
  if (smtpError) {
    return {
      ok: false,
      skipped: true,
      message: smtpError,
      targetDateIso,
      recipients,
      dueCount: 0,
      totalAmount: 0,
    };
  }

  const dueItems = await fetchDueTomorrowInstallments(targetDateIso);
  const totalAmount = dueItems.reduce((sum, item) => sum + item.amount, 0);

  if (dueItems.length === 0) {
    return {
      ok: true,
      skipped: true,
      message: `Sem parcelas com vencimento em ${formatDateIso(targetDateIso)}`,
      targetDateIso,
      recipients,
      dueCount: 0,
      totalAmount: 0,
    };
  }

  const transporter = getTransporter();
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: recipients.join(","),
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

export function startDueTomorrowEmailScheduler(): void {
  if (schedulerTimer) return;

  if (!env.EMAIL_NOTIFY_ENABLED) {
    console.log("[email-reminder] Scheduler de e-mail desativado.");
    return;
  }

  const timeZone = normalizeTimeZone(env.EMAIL_NOTIFY_TZ);
  const scheduleTime = env.EMAIL_NOTIFY_TIME;
  console.log(`[email-reminder] Scheduler ativo para ${scheduleTime} (${timeZone}).`);

  const tick = async () => {
    if (schedulerBusy) return;

    const todayIso = getIsoTodayInTimeZone(timeZone);
    const hourMinute = getHourMinuteInTimeZone(timeZone);

    if (hourMinute !== scheduleTime) return;
    if (schedulerLastRunDate === todayIso) return;

    schedulerBusy = true;
    try {
      const result = await sendDueTomorrowInstallmentsEmail({ force: true, timeZone });
      const log = result.ok ? console.log : console.error;
      log(`[email-reminder] ${result.message}`);
      schedulerLastRunDate = todayIso;
    } catch (error) {
      console.error("[email-reminder] Falha ao executar scheduler:", error);
      schedulerLastRunDate = todayIso;
    } finally {
      schedulerBusy = false;
    }
  };

  schedulerTimer = setInterval(() => {
    void tick();
  }, SCHEDULER_TICK_MS);

  if (env.EMAIL_NOTIFY_RUN_ON_START) {
    void (async () => {
      try {
        const result = await sendDueTomorrowInstallmentsEmail({ force: true, timeZone });
        const log = result.ok ? console.log : console.error;
        log(`[email-reminder] Execucao inicial: ${result.message}`);
      } catch (error) {
        console.error("[email-reminder] Falha na execucao inicial:", error);
      }
    })();
  }
}
