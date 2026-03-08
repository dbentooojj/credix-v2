import { CustomersWorkspace } from "@/src/components/customers/customers-workspace";
import { getPortfolioCustomers, type PortfolioCustomersResponse } from "@/src/lib/api";

export const metadata = {
  title: "Clientes",
};

export default async function CustomersPage() {
  let payload: PortfolioCustomersResponse | null = null;
  let error: string | null = null;

  try {
    payload = await getPortfolioCustomers();
  } catch (requestError) {
    error = requestError instanceof Error ? requestError.message : "Falha ao carregar a tela de clientes.";
  }

  return <CustomersWorkspace initialPayload={payload} initialError={error} />;
}
