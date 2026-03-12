"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiClientError, getCurrentSession, updatePassword, updateProfile } from "../../services";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";

type AccountTab = "profile" | "security" | "help";

type AccountScreenProps = {
  initialTab: string;
  supportEmail: string;
};

type MessageTone = "success" | "error";

type ScreenMessage = {
  tone: MessageTone;
  text: string;
};

type RuleResult = {
  id: string;
  label: string;
  ok: boolean;
};

const WHATSAPP_NUMBER = "+55 47 99960-0742";
const WHATSAPP_LINK = "https://wa.me/5547999600742?text=Ola%21%20Estou%20com%20uma%20duvida%20no%20Credix%2C";

function normalizeTab(value: string): AccountTab {
  if (value === "security" || value === "help") return value;
  return "profile";
}

function messageClassName(tone: MessageTone) {
  if (tone === "success") {
    return "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
  }

  return "border border-rose-400/35 bg-rose-500/10 text-rose-200";
}

function passwordRules(password: string): RuleResult[] {
  return [
    { id: "len", label: "8+ caracteres", ok: password.length >= 8 },
    { id: "upper", label: "1 letra maiuscula", ok: /[A-Z]/.test(password) },
    { id: "lower", label: "1 letra minuscula", ok: /[a-z]/.test(password) },
    { id: "digit", label: "1 numero", ok: /\d/.test(password) },
    { id: "symbol", label: "1 simbolo", ok: /[^A-Za-z0-9]/.test(password) },
    { id: "no-space", label: "sem espacos", ok: !/\s/.test(password) },
  ];
}

function passwordStrengthMeta(password: string) {
  const rules = passwordRules(password);
  const total = rules.length;
  const passed = rules.filter((rule) => rule.ok).length;
  const percent = Math.round((passed / total) * 100);

  if (!password) {
    return { label: "-", color: "#94a3b8", percent, rules };
  }

  if (passed <= 2) {
    return { label: "Fraca", color: "#ef4444", percent, rules };
  }

  if (passed <= 4) {
    return { label: "Media", color: "#f59e0b", percent, rules };
  }

  if (passed < total) {
    return { label: "Boa", color: "#22c55e", percent, rules };
  }

  return { label: "Forte", color: "#16a34a", percent: 100, rules };
}

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem("currentUser");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: unknown; email?: unknown };
    const name = typeof parsed.name === "string" ? parsed.name : "";
    const email = typeof parsed.email === "string" ? parsed.email : "";
    return { name, email };
  } catch {
    return null;
  }
}

export function AccountScreen({ initialTab, supportEmail }: AccountScreenProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>(normalizeTab(initialTab));
  const [message, setMessage] = useState<ScreenMessage | null>(null);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securitySubmitting, setSecuritySubmitting] = useState(false);

  const strength = useMemo(() => passwordStrengthMeta(newPassword), [newPassword]);

  useEffect(() => {
    setActiveTab(normalizeTab(initialTab));
  }, [initialTab]);

  useEffect(() => {
    const storedUser = readStoredUser();
    if (storedUser) {
      setProfileName(storedUser.name || "");
      setProfileEmail(storedUser.email || "");
    }

    let active = true;
    void getCurrentSession()
      .then((session) => {
        if (!active) return;
        const name = session.user?.name || "";
        const email = session.user?.email || "";
        setProfileName(name);
        setProfileEmail(email);

        try {
          window.localStorage.setItem("currentUser", JSON.stringify(session.user || {}));
        } catch {
          // Ignora falhas de localStorage.
        }
      })
      .catch((error) => {
        if (!active) return;
        if (error instanceof ApiClientError && error.status === 401) return;
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState({}, "", url.toString());
  }, [activeTab]);

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedName = profileName.trim();
    const normalizedEmail = profileEmail.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail) {
      setMessage({
        tone: "error",
        text: "Preencha nome e e-mail.",
      });
      return;
    }

    setProfileSubmitting(true);
    setMessage(null);

    try {
      const response = await updateProfile({
        name: normalizedName,
        email: normalizedEmail,
      });

      const user = response.user;
      setProfileName(user.name);
      setProfileEmail(user.email);

      try {
        window.localStorage.setItem("currentUser", JSON.stringify(user || {}));
      } catch {
        // Ignora falhas de localStorage.
      }

      setMessage({
        tone: "success",
        text: "Perfil atualizado com sucesso.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ApiClientError ? error.message || "Falha ao atualizar perfil." : "Erro de conexao ao salvar perfil.",
      });
    } finally {
      setProfileSubmitting(false);
    }
  }

  async function handleSecuritySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage({
        tone: "error",
        text: "A confirmacao da nova senha nao confere.",
      });
      return;
    }

    if (newPassword === currentPassword) {
      setMessage({
        tone: "error",
        text: "A nova senha deve ser diferente da atual.",
      });
      return;
    }

    const missing = strength.rules.filter((rule) => !rule.ok).map((rule) => rule.label);
    if (missing.length > 0) {
      setMessage({
        tone: "error",
        text: `Senha fraca. Use: ${missing.join(", ")}.`,
      });
      return;
    }

    setSecuritySubmitting(true);
    setMessage(null);

    try {
      await updatePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({
        tone: "success",
        text: "Senha alterada com sucesso.",
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ApiClientError ? error.message || "Falha ao alterar senha." : "Erro de conexao ao alterar senha.",
      });
    } finally {
      setSecuritySubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-lm-text">Conta</h1>
        <p className="mt-1 text-sm text-lm-text-muted">Gerencie perfil, seguranca e suporte.</p>
      </div>

      <section className="rounded-2xl border border-lm-border/60 bg-lm-card/90 p-5">
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "profile"
                ? "border-lm-primary bg-lm-primary text-lm-text"
                : "border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
            }`}
            onClick={() => setActiveTab("profile")}
            type="button"
          >
            Meu perfil
          </button>
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "security"
                ? "border-lm-primary bg-lm-primary text-lm-text"
                : "border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
            }`}
            onClick={() => setActiveTab("security")}
            type="button"
          >
            Seguranca
          </button>
          <button
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              activeTab === "help"
                ? "border-lm-primary bg-lm-primary text-lm-text"
                : "border-lm-border text-lm-text-muted hover:bg-lm-sidebar hover:text-lm-text"
            }`}
            onClick={() => setActiveTab("help")}
            type="button"
          >
            Ajuda
          </button>
        </div>

        {message ? <div className={`mb-4 rounded-[11px] px-3 py-2 text-sm ${messageClassName(message.tone)}`}>{message.text}</div> : null}

        {activeTab === "profile" ? (
          <div>
            <h2 className="mb-1 text-xl font-bold text-lm-text">Meu perfil</h2>
            <p className="mb-4 text-sm text-lm-text-muted">Atualize nome e e-mail da sua conta.</p>
            <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleProfileSubmit}>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="profileName">
                  Nome
                </label>
                <Input
                  className="h-11 border-lm-border bg-lm-sidebar text-lm-text"
                  id="profileName"
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                  type="text"
                  value={profileName}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="profileEmail">
                  E-mail
                </label>
                <Input
                  className="h-11 border-lm-border bg-lm-sidebar text-lm-text"
                  id="profileEmail"
                  onChange={(event) => setProfileEmail(event.target.value)}
                  required
                  type="email"
                  value={profileEmail}
                />
              </div>
              <div className="flex justify-end md:col-span-2">
                <Button disabled={profileSubmitting} type="submit">
                  Salvar perfil
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {activeTab === "security" ? (
          <div>
            <h2 className="mb-1 text-xl font-bold text-lm-text">Seguranca</h2>
            <p className="mb-4 text-sm text-lm-text-muted">Troque sua senha de acesso.</p>
            <form className="grid grid-cols-1 gap-4" onSubmit={handleSecuritySubmit}>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="currentPassword">
                  Senha atual
                </label>
                <Input
                  autoComplete="current-password"
                  className="h-11 border-lm-border bg-lm-sidebar text-lm-text"
                  id="currentPassword"
                  minLength={1}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  required
                  type="password"
                  value={currentPassword}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="newPassword">
                  Nova senha
                </label>
                <Input
                  autoComplete="new-password"
                  className="h-11 border-lm-border bg-lm-sidebar text-lm-text"
                  id="newPassword"
                  minLength={8}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  type="password"
                  value={newPassword}
                />
                <div className="mt-2 rounded-xl border border-lm-border bg-lm-sidebar/60 p-3 text-xs text-lm-text-muted">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-lm-text">Forca da senha</span>
                    <span className="font-bold text-lm-text">{strength.label}</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full transition-[width,background-color] duration-200"
                      style={{ backgroundColor: strength.color, width: `${strength.percent}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-1">
                    {strength.rules.map((rule) => (
                      <div className="flex items-center gap-2" key={rule.id}>
                        <span className={`h-2 w-2 rounded-full ${rule.ok ? "bg-emerald-500" : "bg-slate-500"}`} />
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-lm-text-muted" htmlFor="confirmPassword">
                  Confirmar nova senha
                </label>
                <Input
                  autoComplete="new-password"
                  className="h-11 border-lm-border bg-lm-sidebar text-lm-text"
                  id="confirmPassword"
                  minLength={8}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  type="password"
                  value={confirmPassword}
                />
              </div>
              <div className="flex justify-end">
                <Button disabled={securitySubmitting} type="submit">
                  Alterar senha
                </Button>
              </div>
            </form>
          </div>
        ) : null}

        {activeTab === "help" ? (
          <div>
            <h2 className="mb-1 text-xl font-bold text-lm-text">Ajuda</h2>
            <p className="mb-4 text-sm text-lm-text-muted">Contato rapido. Escolha um canal:</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <a
                className="group rounded-2xl border border-lm-border bg-lm-sidebar p-5 transition hover:border-lm-primary-strong hover:bg-lm-card"
                href={`mailto:${supportEmail}`}
              >
                <p className="text-sm font-bold text-lm-text">E-mail</p>
                <p className="mt-1 truncate text-sm font-semibold text-lm-text-muted underline underline-offset-2 group-hover:text-lm-text">
                  {supportEmail}
                </p>
                <p className="mt-2 text-xs text-lm-text-subtle">Clique para enviar mensagem</p>
              </a>

              <a
                className="group rounded-2xl border border-lm-border bg-lm-sidebar p-5 transition hover:border-lm-primary-strong hover:bg-lm-card"
                href={WHATSAPP_LINK}
                rel="noopener noreferrer"
                target="_blank"
              >
                <p className="text-sm font-bold text-lm-text">WhatsApp</p>
                <p className="mt-1 truncate text-sm font-semibold text-lm-text-muted underline underline-offset-2 group-hover:text-lm-text">
                  {WHATSAPP_NUMBER}
                </p>
                <p className="mt-2 text-xs text-lm-text-subtle">Clique para abrir conversa</p>
              </a>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
