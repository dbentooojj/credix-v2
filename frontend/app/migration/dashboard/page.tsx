import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { DashboardScreen } from "@/src/legacy-migration/screens/dashboard/dashboard-screen";

export const metadata: Metadata = {
  title: "Painel financeiro",
};

export default function MigrationDashboardPage() {
  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  );
}
