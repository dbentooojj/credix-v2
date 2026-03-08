import { PortfolioOverviewPage } from "@/src/components/portfolio/portfolio-overview-page";
import { getPortfolioOverview, type PortfolioOverview } from "@/src/lib/api";

export const metadata = {
  title: "Painel da carteira",
};

export default async function PortfolioPage() {
  let payload: PortfolioOverview | null = null;
  let error: string | null = null;

  try {
    payload = await getPortfolioOverview("6m");
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar o painel da carteira.";
  }

  return <PortfolioOverviewPage payload={payload} error={error} />;
}
