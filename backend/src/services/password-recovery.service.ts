import { env } from "../config/env";
import { isEmailServiceConfigured, sendEmail } from "./email.service";

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

type SendPasswordRecoveryEmailInput = {
  recipientName?: string | null;
  recipientEmail: string;
  resetLink: string;
};

export function isPasswordRecoveryEmailConfigured(): boolean {
  return isEmailServiceConfigured();
}

export async function sendPasswordRecoveryEmail(input: SendPasswordRecoveryEmailInput): Promise<void> {
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

  await sendEmail({
    to: safeEmail,
    subject: "[Credix] Recuperacao de senha",
    text,
    html,
  });
}
