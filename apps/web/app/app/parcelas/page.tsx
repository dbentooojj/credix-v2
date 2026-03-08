import { InstallmentsWorkspace } from "@/src/components/installments/installments-workspace";
import { getPortfolioInstallments, type PortfolioInstallmentsResponse } from "@/src/lib/api";

export const metadata = {
  title: "Parcelas",
};

export default async function InstallmentsPage() {
  let payload: PortfolioInstallmentsResponse | null = null;
  let error: string | null = null;

  try {
    payload = await getPortfolioInstallments();
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar a tela de parcelas.";
  }

  return <InstallmentsWorkspace initialPayload={payload} initialError={error} />;
}
