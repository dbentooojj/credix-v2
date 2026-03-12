import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/src/legacy-migration/screens/reset-password/reset-password-screen";

export const metadata: Metadata = {
  title: "Redefinir senha",
};

type MigrationResetPasswordPageProps = {
  searchParams?: {
    token?: string | string[];
  };
};

function readToken(rawToken: string | string[] | undefined) {
  if (Array.isArray(rawToken)) {
    return rawToken[0]?.trim() || "";
  }

  return rawToken?.trim() || "";
}

export default function MigrationResetPasswordPage({ searchParams }: MigrationResetPasswordPageProps) {
  const token = readToken(searchParams?.token);
  return <ResetPasswordScreen token={token} />;
}
