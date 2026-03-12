import type { Metadata } from "next";
import { ReportsScreen } from "@/src/legacy-migration/screens/reports/reports-screen";

export const metadata: Metadata = {
  title: "Relatorios",
};

export default function MigrationReportsPage() {
  return <ReportsScreen />;
}
