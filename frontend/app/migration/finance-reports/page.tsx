import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { FinanceReportsScreen } from "@/src/legacy-migration/screens/finance-reports/finance-reports-screen";

export const metadata: Metadata = {
  title: "Relatorios",
};

export default function MigrationFinanceReportsPage() {
  return (
    <AppShell>
      <FinanceReportsScreen />
    </AppShell>
  );
}
