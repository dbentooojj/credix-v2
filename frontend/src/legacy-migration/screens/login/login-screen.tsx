"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ApiClientError, getCurrentSession, login } from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type MessageTone = "warning" | "success" | "error";

type ScreenMessage = {
  tone: MessageTone;
  text: string;
};

type LoginScreenProps = {
  reason: string;
};

const LOGIN_SUCCESS_MESSAGE = "Login realizado com sucesso. Redirecionando...";
const LOGIN_ERROR_FALLBACK_MESSAGE = "E-mail ou senha invalidos.";
const TIMEOUT_REASON_MESSAGE = "Sua sessao expirou por inatividade. Faca login novamente.";
const RESET_SUCCESS_REASON_MESSAGE = "Senha redefinida com sucesso. Entre com sua nova senha.";

function messageClassName(tone: MessageTone) {
  if (tone === "warning") {
    return "border border-amber-400/30 bg-amber-500/10 text-amber-200";
  }

  if (tone === "success") {
    return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border border-rose-400/35 bg-rose-500/10 text-rose-200";
}

function readReasonMessage(reason: string) {
  const normalized = reason.trim().toLowerCase();
  if (normalized === "timeout") {
    return {
      tone: "warning" as const,
      text: TIMEOUT_REASON_MESSAGE,
    };
  }

  if (normalized === "reset-success") {
    return {
      tone: "success" as const,
      text: RESET_SUCCESS_REASON_MESSAGE,
    };
  }

  return null;
}

export function LoginScreen({ reason }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<ScreenMessage | null>(null);

  useEffect(() => {
    let active = true;

    const reasonMessage = readReasonMessage(reason);
    if (reasonMessage) {
      setMessage(reasonMessage);
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
  }, [reason]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) return;

    setSubmitting(true);

    try {
      const payload = await login({
        email: normalizedEmail,
        password,
      });

      try {
        window.localStorage.setItem("isLoggedIn", "true");
        window.localStorage.setItem("currentUser", JSON.stringify(payload.user || {}));
        window.localStorage.setItem("rememberMe", rememberMe ? "true" : "false");
        window.localStorage.setItem("credix:last-activity-at", String(Date.now()));
        window.localStorage.removeItem("credix:force-logout-at");
      } catch {
        // Ignora falhas de storage.
      }

      setMessage({
        tone: "success",
        text: LOGIN_SUCCESS_MESSAGE,
      });

      window.setTimeout(() => {
        window.location.href = "/admin/visao-geral.html";
      }, 600);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ApiClientError ? error.message || LOGIN_ERROR_FALLBACK_MESSAGE : LOGIN_ERROR_FALLBACK_MESSAGE,
      });
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
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="flex h-[58px] w-full items-center gap-[10px] rounded-xl border border-lm-border bg-white/[0.04] px-3.5 transition focus-within:border-lm-primary-strong focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]">
              <span className="sr-only">Email</span>
              <User aria-hidden="true" className="h-4 w-4 shrink-0 text-lm-text-muted" />
              <Input
                autoComplete="email"
                className="h-auto border-0 bg-transparent p-0 text-[1.08rem] font-medium placeholder:text-lm-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
                id="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                required
                type="email"
                value={email}
              />
            </label>

            <div className="relative">
              <label className="flex h-[58px] w-full items-center gap-[10px] rounded-xl border border-lm-border bg-white/[0.04] px-3.5 pr-12 transition focus-within:border-lm-primary-strong focus-within:bg-white/[0.06] focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.16)]">
                <span className="sr-only">Senha</span>
                <Lock aria-hidden="true" className="h-4 w-4 shrink-0 text-lm-text-muted" />
                <Input
                  autoComplete="current-password"
                  className="h-auto border-0 bg-transparent p-0 text-[1.08rem] font-medium placeholder:text-lm-text-muted focus-visible:ring-0 focus-visible:ring-offset-0"
                  id="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Senha"
                  required
                  type={passwordVisible ? "text" : "password"}
                  value={password}
                />
              </label>
              <button
                aria-label={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
                aria-pressed={passwordVisible}
                className="absolute right-[10px] top-1/2 inline-flex h-[30px] w-[30px] -translate-y-1/2 items-center justify-center rounded-lg text-lm-text-muted transition hover:bg-white/10 hover:text-lm-text"
                onClick={() => setPasswordVisible((current) => !current)}
                type="button"
              >
                {passwordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3 text-[1.02rem]">
              <label className="inline-flex cursor-pointer items-center gap-2 text-lm-text-muted">
                <input
                  checked={rememberMe}
                  className="h-4 w-4 appearance-none rounded-full border border-lm-text-muted/70 bg-slate-950/80 checked:border-emerald-400 checked:bg-emerald-400"
                  id="rememberMe"
                  onChange={(event) => setRememberMe(event.target.checked)}
                  type="checkbox"
                />
                <span>Lembrar-me</span>
              </label>
              <Link className="italic text-lm-text-muted transition hover:text-lm-text" href="/forgot-password">
                Esqueceu?
              </Link>
            </div>

            {message ? (
              <div className={`rounded-[11px] px-3 py-2 text-sm ${messageClassName(message.tone)}`}>{message.text}</div>
            ) : null}

            <Button
              className="h-[50px] w-full rounded-xl border border-sky-400/60 bg-[linear-gradient(135deg,#3a5ff1_0%,#2f66f5_54%,#2b7ff7_100%)] text-lm-text shadow-[0_12px_28px_-16px_rgba(37,99,235,0.9),inset_0_1px_0_rgba(219,234,254,0.3)] hover:translate-y-[-1px] hover:brightness-105"
              disabled={submitting}
              type="submit"
            >
              Entrar
            </Button>
          </form>

          <p className="mt-[22px] text-center text-[0.8rem] text-lm-text-subtle">&copy; 2026 Credix</p>
        </div>
      </section>
    </main>
  );
}
