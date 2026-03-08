import { ReportsWorkspace } from "@/src/components/reports/reports-workspace";
import { getPortfolioReports, type PortfolioReportsResponse } from "@/src/lib/api";

export const metadata = {
  title: "Relatorios",
};

export default async function ReportsPage() {
  let payload: PortfolioReportsResponse | null = null;
  let error: string | null = null;

  try {
    payload = await getPortfolioReports();
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar a tela de relatorios.";
  }

  return <ReportsWorkspace initialPayload={payload} initialError={error} />;
}
