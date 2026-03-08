import { FinanceWorkspace } from "@/src/components/finance/finance-workspace";

export const metadata = {
  title: "Contas a Pagar",
};

export default function PayablesPage() {
  return <FinanceWorkspace mode="expense" />;
}
