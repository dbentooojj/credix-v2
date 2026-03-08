import { LoansWorkspace } from "@/src/components/loans/loans-workspace";
import {
  getPortfolioLoanSimulations,
  getPortfolioLoans,
  type PortfolioLoanSimulationsResponse,
  type PortfolioLoansResponse,
} from "@/src/lib/api";

export const metadata = {
  title: "Emprestimos",
};

export default async function LoansPage() {
  let payload: PortfolioLoansResponse | null = null;
  let error: string | null = null;
  let simulationsPayload: PortfolioLoanSimulationsResponse | null = null;
  let simulationsError: string | null = null;

  try {
    payload = await getPortfolioLoans();
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar a tela de emprestimos.";
  }

  try {
    simulationsPayload = await getPortfolioLoanSimulations();
  } catch (requestError) {
    simulationsError = requestError instanceof Error ? requestError.message : "Falha ao carregar simulacoes pendentes.";
  }

  return (
    <LoansWorkspace
      initialPayload={payload}
      initialError={error}
      initialSimulationsPayload={simulationsPayload}
      initialSimulationsError={simulationsError}
    />
  );
}
