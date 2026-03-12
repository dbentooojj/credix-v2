import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { FinanceTransactionsScreen } from "@/src/legacy-migration/screens/finance/finance-transactions-screen";

export const metadata: Metadata = {
  title: "Contas a pagar",
};

export default function MigrationContasAPagarPage() {
  return (
    <AppShell>
      <FinanceTransactionsScreen mode="expense" />
    </AppShell>
  );
}
