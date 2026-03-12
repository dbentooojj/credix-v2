"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Lock } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ApiClientError, getCurrentSession, resetPassword } from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type MessageTone = "success" | "error";

type ScreenMessage = {
  tone: MessageTone;
  text: string;
};

const MISSING_TOKEN_MESSAGE = "Link de recuperacao invalido. Solicite um novo e-mail.";
const PASSWORD_MISMATCH_MESSAGE = "A confirmacao da nova senha nao confere.";
const SUCCESS_FALLBACK_MESSAGE = "Senha redefinida com sucesso.";
const ERROR_FALLBACK_MESSAGE = "Falha ao redefinir senha.";

function messageClassName(tone: MessageTone) {
  if (tone === "success") {
    return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border border-rose-400/35 bg-rose-500/10 text-rose-200";
}

type ResetPasswordScreenProps = {
  token: string;
};

export function ResetPasswordScreen({ token }: ResetPasswordScreenProps) {
  const hasToken = token.length > 0;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<ScreenMessage | null>(null);

  useEffect(() => {
    let active = true;

    if (!hasToken) {
      setMessage({
        tone: "error",
        text: MISSING_TOKEN_MESSAGE,
      });
    } else {
      setMessage((current) => {
        if (current?.text === MISSING_TOKEN_MESSAGE) return null;
        return current;
      });
    }

    void getCurrentSession()
      .then(() => {
        if (!active) return;
        window.location.href = "/admin/visao-geral.html";
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 401) return;
      });

    return () => {
      active = false;
    };
  }, [hasToken]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasToken) return;

    if (newPassword !== confirmPassword) {
      setMessage({
        tone: "error",
        text: PASSWORD_MISMATCH_MESSAGE,
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const response = await resetPassword(token, newPassword, confirmPassword);
      setMessage({
        tone: "success",
        text: response?.message || SUCCESS_FALLBACK_MESSAGE,
      });

      window.setTimeout(() => {
        window.location.href = "/login?reason=reset-success";
      }, 1200);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setMessage({
          tone: "error",
          text: error.message || ERROR_FALLBACK_MESSAGE,
        });
      } else {
        setMessage({
          tone: "error",
          text: ERROR_FALLBACK_MESSAGE,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main
      className="min-h-screen w-full p-4 sm:p-6"
      style={{
        background:
          "radial-gradient(1200px 560px at 8% -18%, rgba(124,58,237,0.22), transparent 56%), radial-gradient(900px 420px at 100% -6%, rgba(139,92,246,0.17), transparent 60%), linear-gradient(165deg, #0B0712 0%, #120A1F 50%, #1A112B 100%)",
      }}
    >
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[460px] flex-col justify-center">
        <div className="mb-9 flex justify-center">
          <BrandWordmark />
        </div>

        <div>
          <header className="mb-4 text-center">
            <h1 className="text-2xl font-bold text-lm-text">Redefinir senha</h1>
            <p className="mt-1.5 text-[0.95rem] text-lm-text-muted">Digite sua nova senha para concluir a recuperacao.</p>
          </header>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="flex h-[58px] w-full items-center gap-[10px] rounded-xl border border-lm-border bg-white/[0.04] px-3.5 transition focus-within:border-lm-primary-strong focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]">
              <span className="sr-only">Nova senha</span>
              <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-lm-text-muted" />
              <Input
                autoComplete="new-password"
                className="h-auto border-0 bg-transparent p-0 text-[1.08rem] font-medium placeholder:text-lm-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
                id="newPassword"
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Nova senha"
                required
                type="password"
                value={newPassword}
              />
            </label>

            <label className="flex h-[58px] w-full items-center gap-[10px] rounded-xl border border-lm-border bg-white/[0.04] px-3.5 transition focus-within:border-lm-primary-strong focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]">
              <span className="sr-only">Confirmar nova senha</span>
              <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-lm-text-muted" />
              <Input
                autoComplete="new-password"
                className="h-auto border-0 bg-transparent p-0 text-[1.08rem] font-medium placeholder:text-lm-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
                id="confirmPassword"
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Confirmar nova senha"
                required
                type="password"
                value={confirmPassword}
              />
            </label>

            <p className="text-[0.8rem] text-lm-text-muted">
              Regras: minimo de 8 caracteres, com maiuscula, minuscula, numero e simbolo.
            </p>

            {message ? (
              <div className={`rounded-[11px] px-3 py-2 text-sm ${messageClassName(message.tone)}`}>{message.text}</div>
            ) : null}

            <Button
              className="h-[46px] w-full rounded-[11px] border border-lm-primary-strong/60 bg-[linear-gradient(135deg,#7C3AED_0%,#8B5CF6_100%)] text-lm-text shadow-[0_10px_24px_-16px_rgba(124,58,237,0.86),inset_0_1px_0_rgba(196,181,253,0.22)] hover:brightness-105"
              disabled={submitting || !hasToken}
              type="submit"
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              {submitting ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link className="inline-flex items-center gap-2 text-base italic text-lm-text-muted transition hover:text-lm-text" href="/login">
              <ArrowLeft className="h-4 w-4" />
              Voltar para o login
            </Link>
          </div>

          <p className="mt-[22px] text-center text-[0.8rem] text-lm-text-subtle">&copy; 2026 Credix</p>
        </div>
      </section>
    </main>
  );
}
