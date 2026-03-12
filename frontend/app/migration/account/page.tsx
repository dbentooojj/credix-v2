import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { AccountScreen } from "@/src/legacy-migration/screens/account/account-screen";

export const metadata: Metadata = {
  title: "Conta",
};

type MigrationAccountPageProps = {
  searchParams?: {
    tab?: string | string[];
  };
};

function readTab(rawTab: string | string[] | undefined) {
  if (Array.isArray(rawTab)) {
    return rawTab[0]?.trim() || "profile";
  }

  return rawTab?.trim() || "profile";
}

function extractEmail(raw?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;

  const angleMatch = value.match(/<([^<>]+)>/);
  const candidate = (angleMatch?.[1] || value).replace(/^mailto:/i, "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return null;

  return candidate;
}

function resolveSupportEmail(): string {
  const notifyFirst = process.env.EMAIL_NOTIFY_TO
    ?.split(/[;,]/)
    .map((item) => item.trim())
    .find(Boolean);

  const candidates = [process.env.SMTP_FROM, process.env.SMTP_USER, notifyFirst, process.env.ADMIN_EMAIL];
  for (const item of candidates) {
    const email = extractEmail(item);
    if (email) return email;
  }

  return "usecredix@gmail.com";
}

export default function MigrationAccountPage({ searchParams }: MigrationAccountPageProps) {
  const initialTab = readTab(searchParams?.tab);
  const supportEmail = resolveSupportEmail();

  return (
    <AppShell>
      <AccountScreen initialTab={initialTab} supportEmail={supportEmail} />
    </AppShell>
  );
}
