import type { Metadata } from "next";
import { LoansScreen } from "@/src/legacy-migration/screens/loans/loans-screen";

export const metadata: Metadata = {
  title: "Emprestimos",
};

export default function MigrationLoansPage() {
  return <LoansScreen />;
}
