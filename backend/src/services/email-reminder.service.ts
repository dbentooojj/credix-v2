import { InstallmentStatus } from "@prisma/client";
import { env } from "../config/env";
import { addDays, getIsoTodayInTimeZone, normalizeTimeZone } from "../lib/date-time";
import { toSafeNumber } from "../lib/numbers";
import { prisma } from "../lib/prisma";
import { getSmtpConfigError, sendEmail } from "./email.service";

type DueInstallment = {
  ownerUserId: number;
  installmentId: number;
  installmentNumber: number;
  loanId: number;
  dueDateIso: string;
  status: InstallmentStatus;
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  amount: number;
};

type DueInstallmentGroup = {
  clientId: number;
  clientName: string;
  clientPhone: string | null;
  installments: DueInstallment[];
  dueCount: number;
  totalAmount: number;
};

type SendDueTodayEmailOptions = {
  force?: boolean;
  targetDateIso?: string;
  recipients?: string[];
  timeZone?: string;
  daysAhead?: number;
  ownerUserId?: number;
};

export type SendDueTodayEmailResult = {
  ok: boolean;
  skipped: boolean;
  message: string;
  targetDateIso: string;
  recipients: string[];
  dueCount: number;
  clientCount: number;
  totalAmount: number;
  daysAhead: number;
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

function getPhoneDisplay(rawPhone: string | null | undefined): string {
  const normalized = String(rawPhone || "").trim();
  return normalized || "-";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function normalizeDaysAhead(raw: number): number {
  if (!Number.isFinite(raw)) return 0;
  const integer = Math.trunc(raw);
  return integer >= 0 ? integer : 0;
}

function getIsoDateDiff(baseIso: string, targetIso: string): number {
  const baseDate = new Date(`${baseIso}T00:00:00Z`);
  const targetDate = new Date(`${targetIso}T00:00:00Z`);
  if (Number.isNaN(baseDate.getTime()) || Number.isNaN(targetDate.getTime())) return 0;
  return Math.round((targetDate.getTime() - baseDate.getTime()) / 86_400_000);
}

function getDueReference(daysAhead: number): { title: string; sentence: string } {
  if (daysAhead === 0) return { title: "hoje", sentence: "hoje" };
  if (daysAhead === 1) return { title: "amanha", sentence: "amanha" };
  if (daysAhead > 1) return { title: `em ${daysAhead} dia(s)`, sentence: `em ${daysAhead} dia(s)` };
  return { title: "na data selecionada", sentence: "na data selecionada" };
}

type RecipientSource = "override" | "owner-user";

type RecipientResolution = {
  recipients: string[];
  source: RecipientSource;
  message?: string;
};

async function getOwnerEmailsById(ownerUserIds: number[]): Promise<Map<number, string>> {
  if (ownerUserIds.length === 0) return new Map<number, string>();

  const rows = await prisma.user.findMany({
    where: { id: { in: ownerUserIds } },
    select: { id: true, email: true },
  });

  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(row.id, String(row.email || "").trim().toLowerCase());
  }
  return map;
}

function resolveRecipientsForOwner(
  ownerUserId: number,
  ownerEmailsById: Map<number, string>,
  override?: string[],
): RecipientResolution {
  if (override && override.length > 0) {
    return {
      recipients: parseRecipients(override.join(",")),
      source: "override",
    };
  }

  const ownerEmail = ownerEmailsById.get(ownerUserId) ?? "";
  const recipients = parseRecipients(ownerEmail);
  if (recipients.length > 0) {
    return {
      recipients,
      source: "owner-user",
    };
  }

  return {
    recipients: [],
    source: "owner-user",
    message: `Usuario ${ownerUserId} sem e-mail valido para notificacao`,
  };
}

async function fetchDueInstallments(targetDateIso: string, ownerUserId?: number): Promise<DueInstallment[]> {
  const dueDate = new Date(`${targetDateIso}T00:00:00Z`);

  const rows = await prisma.installment.findMany({
    where: {
      dueDate,
      status: { not: InstallmentStatus.PAGO },
      ...(Number.isFinite(ownerUserId) ? { ownerUserId } : {}),
    },
    orderBy: [
      { client: { name: "asc" } },
      { installmentNumber: "asc" },
      { id: "asc" },
    ],
    select: {
      id: true,
      ownerUserId: true,
      loanId: true,
      installmentNumber: true,
      dueDate: true,
      amount: true,
      status: true,
      client: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ownerUserId: row.ownerUserId,
    installmentId: row.id,
    installmentNumber: row.installmentNumber,
    loanId: row.loanId,
    dueDateIso: row.dueDate.toISOString().slice(0, 10),
    status: row.status,
    clientId: row.client.id,
    clientName: row.client.name,
    clientPhone: row.client.phone,
    amount: toSafeNumber(row.amount),
  }));
}

function groupByClient(items: DueInstallment[]): DueInstallmentGroup[] {
  const map = new Map<number, DueInstallmentGroup>();

  for (const item of items) {
    const current = map.get(item.clientId);
    if (!current) {
      map.set(item.clientId, {
        clientId: item.clientId,
        clientName: item.clientName,
        clientPhone: item.clientPhone,
        installments: [item],
        dueCount: 1,
        totalAmount: item.amount,
      });
      continue;
    }

    current.installments.push(item);
    current.dueCount += 1;
    current.totalAmount += item.amount;
  }

  return [...map.values()];
}

function groupByOwner(items: DueInstallment[]): Map<number, DueInstallment[]> {
  const map = new Map<number, DueInstallment[]>();
  for (const item of items) {
    const current = map.get(item.ownerUserId);
    if (!current) {
      map.set(item.ownerUserId, [item]);
      continue;
    }
    current.push(item);
  }
  return map;
}

function buildSubject(targetDateIso: string, dueCount: number, totalAmount: number): string {
  const dateLabel = formatDateIso(targetDateIso);
  return `[Credix] Vencimentos (${dateLabel}): ${dueCount} parcela(s) - ${formatCurrency(totalAmount)}`;
}

function buildTextBody(
  groups: DueInstallmentGroup[],
  targetDateIso: string,
  totalAmount: number,
  daysAhead: number,
): string {
  const dateLabel = formatDateIso(targetDateIso);
  const dueCount = groups.reduce((sum, group) => sum + group.dueCount, 0);
  const reference = getDueReference(daysAhead);

  if (dueCount === 0) {
    return [
      `Parcelas para ${reference.title} (${dateLabel})`,
      `Total de parcelas: 0 | Valor total: ${formatCurrency(0)}`,
      "",
      `Nenhuma parcela vence ${reference.sentence}.`,
      "",
      "Mensagem automatica do Credix.",
    ].join("\n");
  }

  const clientSections = groups
    .map((group) => {
      const phoneDisplay = getPhoneDisplay(group.clientPhone);
      const whatsappPhone = normalizeWhatsAppPhone(group.clientPhone);
      const clientPhoneLabel = whatsappPhone
        ? `${phoneDisplay} (https://wa.me/${whatsappPhone})`
        : phoneDisplay;

      const rows = group.installments.map((item) => {
        const rowPhoneDisplay = getPhoneDisplay(item.clientPhone);
        const rowWhatsappPhone = normalizeWhatsAppPhone(item.clientPhone);
        const rowPhoneLabel = rowWhatsappPhone
          ? `${rowPhoneDisplay} (https://wa.me/${rowWhatsappPhone})`
          : rowPhoneDisplay;

        return `#${item.installmentNumber} | #${item.loanId} | ${formatDateIso(item.dueDateIso)} | ${formatCurrency(item.amount)} | ${rowPhoneLabel}`;
      });

      return [
        `Cliente: ${group.clientName} | Telefone: ${clientPhoneLabel}`,
        `Subtotal do cliente: ${group.dueCount} parcela(s) | ${formatCurrency(group.totalAmount)}`,
        "Parcela | Emprestimo | Vencimento | Valor | Telefone (WhatsApp)",
        ...rows,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Parcelas para ${reference.title} (${dateLabel})`,
    `Total de parcelas: ${dueCount} | Valor total: ${formatCurrency(totalAmount)}`,
    "",
    clientSections,
    "",
    "Mensagem automatica do Credix.",
  ].join("\n");
}

function buildHtmlBody(
  groups: DueInstallmentGroup[],
  targetDateIso: string,
  totalAmount: number,
  daysAhead: number,
): string {
  const dateLabel = formatDateIso(targetDateIso);
  const dueCount = groups.reduce((sum, group) => sum + group.dueCount, 0);
  const reference = getDueReference(daysAhead);

  const sections = groups
    .map((group) => {
      const clientPhoneDisplay = escapeHtml(getPhoneDisplay(group.clientPhone));
      const clientWhatsappPhone = normalizeWhatsAppPhone(group.clientPhone);
      const clientPhoneCell = clientWhatsappPhone
        ? `<a href="https://wa.me/${clientWhatsappPhone}" target="_blank" rel="noopener noreferrer">${clientPhoneDisplay}</a>`
        : clientPhoneDisplay;

      const rows = group.installments
        .map((item) => {
          const rowPhoneDisplay = escapeHtml(getPhoneDisplay(item.clientPhone));
          const rowWhatsappPhone = normalizeWhatsAppPhone(item.clientPhone);
          const rowPhoneCell = rowWhatsappPhone
            ? `<a href="https://wa.me/${rowWhatsappPhone}" target="_blank" rel="noopener noreferrer">${rowPhoneDisplay}</a>`
            : rowPhoneDisplay;

          return `
            <tr>
              <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">#${item.installmentNumber}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">#${item.loanId}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;text-align:center;">${formatDateIso(item.dueDateIso)}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;text-align:right;">${formatCurrency(item.amount)}</td>
              <td style="padding:10px;border:1px solid #e5e7eb;">${rowPhoneCell}</td>
            </tr>
          `;
        })
        .join("");

      return `
        <section style="margin-top:20px;">
          <h2 style="margin:0 0 8px;font-size:17px;color:#111827;">
            ${escapeHtml(group.clientName)} - ${clientPhoneCell}
          </h2>
          <p style="margin:0 0 10px;font-size:14px;color:#374151;">
            Subtotal do cliente: <strong>${group.dueCount}</strong> parcela(s) | <strong>${formatCurrency(group.totalAmount)}</strong>
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <thead>
              <tr>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:center;background:#f8fafc;">Parcela</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:center;background:#f8fafc;">Emprestimo</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:center;background:#f8fafc;">Vencimento</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:right;background:#f8fafc;">Valor</th>
                <th style="padding:10px;border:1px solid #e5e7eb;text-align:left;background:#f8fafc;">Telefone (WhatsApp)</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </section>
      `;
    })
    .join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.45;">
      <h1 style="margin:0 0 10px;font-size:22px;">Parcelas para ${reference.title} (${dateLabel})</h1>
      <p style="margin:0 0 14px;font-size:14px;">
        Total de parcelas: <strong>${dueCount}</strong> | Valor total: <strong>${formatCurrency(totalAmount)}</strong>
      </p>
      ${dueCount === 0 ? `<p style="margin:0;font-size:14px;">Nenhuma parcela vence ${reference.sentence}.</p>` : sections}
      <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">Mensagem automatica do Credix.</p>
    </div>
  `;
}

export async function sendDueTodayInstallmentsEmail(
  options: SendDueTodayEmailOptions = {},
): Promise<SendDueTodayEmailResult> {
  const configuredDaysAhead = normalizeDaysAhead(options.daysAhead ?? env.EMAIL_NOTIFY_DAYS_AHEAD);
  const force = Boolean(options.force);

  if (!env.EMAIL_NOTIFY_ENABLED && !force) {
    return {
      ok: true,
      skipped: true,
      message: "Notificacao por e-mail desativada no .env",
      targetDateIso: "",
      recipients: [],
      dueCount: 0,
      clientCount: 0,
      totalAmount: 0,
      daysAhead: configuredDaysAhead,
    };
  }

  const timeZone = normalizeTimeZone(options.timeZone ?? env.EMAIL_NOTIFY_TZ);
  const todayIso = getIsoTodayInTimeZone(timeZone);
  const defaultTargetDateIso = addDays(todayIso, configuredDaysAhead);
  const explicitTargetDateIso = options.targetDateIso?.trim();

  const targetDateIso = (() => {
    if (!explicitTargetDateIso) return defaultTargetDateIso;
    return isIsoDate(explicitTargetDateIso) ? explicitTargetDateIso : "";
  })();

  if (!targetDateIso) {
    return {
      ok: false,
      skipped: true,
      message: "Data alvo invalida. Use YYYY-MM-DD",
      targetDateIso: "",
      recipients: [],
      dueCount: 0,
      clientCount: 0,
      totalAmount: 0,
      daysAhead: configuredDaysAhead,
    };
  }

  const effectiveDaysAhead = explicitTargetDateIso
    ? getIsoDateDiff(todayIso, targetDateIso)
    : configuredDaysAhead;

  const parsedOwnerUserId = Number(options.ownerUserId);
  const scopeOwnerUserId = Number.isFinite(parsedOwnerUserId) && parsedOwnerUserId > 0
    ? Math.trunc(parsedOwnerUserId)
    : undefined;

  const dueItems = await fetchDueInstallments(targetDateIso, scopeOwnerUserId);
  const dueGroups = groupByClient(dueItems);
  const dueCount = dueItems.length;
  const clientCount = dueGroups.length;
  const totalAmount = dueItems.reduce((sum, item) => sum + item.amount, 0);

  if (dueCount === 0) {
    return {
      ok: true,
      skipped: true,
      message: `Nenhuma parcela encontrada para ${formatDateIso(targetDateIso)}. E-mail nao enviado`,
      targetDateIso,
      recipients: [],
      dueCount,
      clientCount,
      totalAmount,
      daysAhead: effectiveDaysAhead,
    };
  }

  const smtpError = getSmtpConfigError();
  if (smtpError) {
    return {
      ok: false,
      skipped: true,
      message: smtpError,
      targetDateIso,
      recipients: [],
      dueCount,
      clientCount,
      totalAmount,
      daysAhead: effectiveDaysAhead,
    };
  }

  const itemsByOwner = groupByOwner(dueItems);
  const ownerIds = [...itemsByOwner.keys()];
  const ownerEmailsById = await getOwnerEmailsById(ownerIds);
  const recipientsSet = new Set<string>();
  let sentEmails = 0;
  const skippedOwners: string[] = [];
  const failedOwners: string[] = [];

  for (const [ownerId, ownerItems] of itemsByOwner.entries()) {
    const recipientResolution = resolveRecipientsForOwner(ownerId, ownerEmailsById, options.recipients);
    const recipients = recipientResolution.recipients;

    if (recipients.length === 0) {
      skippedOwners.push(
        recipientResolution.message
          || `Usuario ${ownerId} sem destinatarios validos (${recipientResolution.source})`,
      );
      continue;
    }

    const ownerGroups = groupByClient(ownerItems);
    const ownerDueCount = ownerItems.length;
    const ownerTotalAmount = ownerItems.reduce((sum, item) => sum + item.amount, 0);

    try {
      await sendEmail({
        to: recipients,
        subject: buildSubject(targetDateIso, ownerDueCount, ownerTotalAmount),
        text: buildTextBody(ownerGroups, targetDateIso, ownerTotalAmount, effectiveDaysAhead),
        html: buildHtmlBody(ownerGroups, targetDateIso, ownerTotalAmount, effectiveDaysAhead),
      });
      sentEmails += 1;
      recipients.forEach((recipient) => recipientsSet.add(recipient));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedOwners.push(`Usuario ${ownerId}: ${message}`);
    }
  }

  const recipients = [...recipientsSet];

  if (sentEmails === 0) {
    const reasonParts: string[] = [];
    if (skippedOwners.length > 0) {
      reasonParts.push(`Sem destinatario: ${skippedOwners.join(" | ")}`);
    }
    if (failedOwners.length > 0) {
      reasonParts.push(`Falha no envio: ${failedOwners.join(" | ")}`);
    }

    return {
      ok: false,
      skipped: true,
      message: reasonParts.join(" | ") || "Nenhum e-mail enviado para os usuarios com parcelas pendentes",
      targetDateIso,
      recipients,
      dueCount,
      clientCount,
      totalAmount,
      daysAhead: effectiveDaysAhead,
    };
  }

  if (skippedOwners.length > 0 || failedOwners.length > 0) {
    const details: string[] = [`Envio parcial: ${sentEmails} e-mail(s) enviado(s)`];
    if (skippedOwners.length > 0) details.push(`Ignorados: ${skippedOwners.join(" | ")}`);
    if (failedOwners.length > 0) details.push(`Erros: ${failedOwners.join(" | ")}`);

    return {
      ok: true,
      skipped: false,
      message: details.join(" | "),
      targetDateIso,
      recipients,
      dueCount,
      clientCount,
      totalAmount,
      daysAhead: effectiveDaysAhead,
    };
  }

  return {
    ok: true,
    skipped: false,
    message: `E-mail enviado para ${sentEmails} usuario(s) com ${dueCount} parcela(s) em ${clientCount} cliente(s)`,
    targetDateIso,
    recipients,
    dueCount,
    clientCount,
    totalAmount,
    daysAhead: effectiveDaysAhead,
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
