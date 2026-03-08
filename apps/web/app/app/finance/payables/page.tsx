import { ChecklistCard } from "../../../../src/components/admin/checklist-card";
import { getFinanceBlueprint } from "../../../../src/lib/finance-blueprints";

export const metadata = {
  title: "Contas a Pagar",
};

const blueprint = getFinanceBlueprint("payables");

export default function PayablesPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="status-row">
          <span className="eyebrow">{blueprint.kicker}</span>
          <span className="chip chip--warning">Proxima implementacao</span>
        </div>
        <h2 className="page-title">{blueprint.title}</h2>
        <p className="page-subtitle">{blueprint.summary}</p>
      </section>

      <section className="section-grid section-grid--two">
        <ChecklistCard
          eyebrow="Escopo visual"
          title="UI que precisa nascer no web"
          text="Nada desta tela volta a ser EJS."
          items={blueprint.uiSlices}
        />
        <ChecklistCard
          eyebrow="Contrato de API"
          title="Backend que essa tela espera"
          text="O backend deve expor somente dados e comandos."
          items={blueprint.apiContracts}
        />
      </section>

      <section className="section-grid section-grid--two">
        <ChecklistCard
          eyebrow="Pronto quando"
          title="Criterio de saida do legado"
          text="Quando estes itens forem verdade, a tela antiga deixa de ser o caminho principal."
          items={blueprint.doneCriteria}
        />
        <ChecklistCard
          eyebrow="Primeiro recorte"
          title="Entrega sugerida"
          text="A menor entrega util aqui e a listagem completa com estado vazio, filtros e acao principal."
          items={blueprint.firstDelivery}
        />
      </section>
    </div>
  );
}
