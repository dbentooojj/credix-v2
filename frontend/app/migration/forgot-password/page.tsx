import type { Metadata } from "next";
import { ForgotPasswordScreen } from "@/src/legacy-migration/screens/forgot-password/forgot-password-screen";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function MigrationForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
