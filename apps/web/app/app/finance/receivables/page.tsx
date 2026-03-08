import { FinanceWorkspace } from "@/src/components/finance/finance-workspace";

export const metadata = {
  title: "Valores a Receber",
};

export default function ReceivablesPage() {
  return <FinanceWorkspace mode="income" />;
}
