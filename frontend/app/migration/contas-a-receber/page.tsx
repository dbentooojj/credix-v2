import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { FinanceTransactionsScreen } from "@/src/legacy-migration/screens/finance/finance-transactions-screen";

export const metadata: Metadata = {
  title: "Contas a receber",
};

export default function MigrationContasAReceberPage() {
  return (
    <AppShell>
      <FinanceTransactionsScreen mode="income" />
    </AppShell>
  );
}
