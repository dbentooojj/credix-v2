import type { Metadata } from "next";
import { LoginScreen } from "@/src/legacy-migration/screens/login/login-screen";

export const metadata: Metadata = {
  title: "Login",
};

type MigrationLoginPageProps = {
  searchParams?: {
    reason?: string | string[];
  };
};

function readReason(rawReason: string | string[] | undefined) {
  if (Array.isArray(rawReason)) {
    return rawReason[0]?.trim() || "";
  }

  return rawReason?.trim() || "";
}

export default function MigrationLoginPage({ searchParams }: MigrationLoginPageProps) {
  const reason = readReason(searchParams?.reason);
  return <LoginScreen reason={reason} />;
}
