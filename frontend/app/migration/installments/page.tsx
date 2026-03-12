import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { InstallmentsScreen } from "@/src/legacy-migration/screens/installments/installments-screen";

export const metadata: Metadata = {
  title: "Parcelas",
};

export default function MigrationInstallmentsPage() {
  return (
    <AppShell>
      <InstallmentsScreen />
    </AppShell>
  );
}

