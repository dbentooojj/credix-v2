import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { DebtorsScreen } from "@/src/legacy-migration/screens/debtors/debtors-screen";

export const metadata: Metadata = {
  title: "Clientes",
};

export default function MigrationDebtorsPage() {
  return (
    <AppShell>
      <DebtorsScreen />
    </AppShell>
  );
}
