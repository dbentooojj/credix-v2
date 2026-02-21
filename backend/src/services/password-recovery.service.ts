import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

let cachedTransporter: Transporter | null = null;

function normalizeOptional(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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

  const configError = smtpConfigErrorMessage();
  if (configError) {
    throw new Error(configError);
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

type SendPasswordRecoveryEmailInput = {
  recipientName?: string | null;
  recipientEmail: string;
  resetLink: string;
};

export function isPasswordRecoveryEmailConfigured(): boolean {
  return smtpConfigErrorMessage() === null;
}

export async function sendPasswordRecoveryEmail(input: SendPasswordRecoveryEmailInput): Promise<void> {
  const transporter = getTransporter();
  const safeName = normalizeOptional(input.recipientName || undefined) || "usuario";
  const safeEmail = input.recipientEmail.trim().toLowerCase();
  const safeLink = input.resetLink.trim();
  const expiresText = env.RESET_PASSWORD_EXPIRES_IN;

  const text = [
    `Ola, ${safeName}.`,
    "",
    "Recebemos um pedido para redefinir sua senha no Credix.",
    "Use o link abaixo para criar uma nova senha:",
    safeLink,
    "",
    `Este link expira em ${expiresText}.`,
    "Se voce nao solicitou, ignore este e-mail.",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;color:#111827;line-height:1.5;">
      <h2 style="margin:0 0 10px;">Recuperacao de senha</h2>
      <p style="margin:0 0 12px;">Ola, <strong>${escapeHtml(safeName)}</strong>.</p>
      <p style="margin:0 0 12px;">Recebemos um pedido para redefinir sua senha no Credix.</p>
      <p style="margin:0 0 14px;">
        <a href="${escapeHtml(safeLink)}" style="display:inline-block;padding:10px 14px;background:#1e40af;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:700;">
          Redefinir senha
        </a>
      </p>
      <p style="margin:0 0 6px;">Ou cole este link no navegador:</p>
      <p style="margin:0 0 12px;word-break:break-all;"><a href="${escapeHtml(safeLink)}">${escapeHtml(safeLink)}</a></p>
      <p style="margin:0 0 6px;">Este link expira em <strong>${escapeHtml(expiresText)}</strong>.</p>
      <p style="margin:0;color:#6b7280;font-size:12px;">Se voce nao solicitou, ignore este e-mail.</p>
    </div>
  `;

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: safeEmail,
    subject: "[Credix] Recuperacao de senha",
    text,
    html,
  });
}

