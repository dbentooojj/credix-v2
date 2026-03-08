import { ChecklistCard } from "../../../../src/components/admin/checklist-card";
import { getFinanceBlueprint } from "../../../../src/lib/finance-blueprints";

export const metadata = {
  title: "Valores a Receber",
};

const blueprint = getFinanceBlueprint("receivables");

export default function ReceivablesPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <div className="status-row">
          <span className="eyebrow">{blueprint.kicker}</span>
          <span className="chip chip--success">Mesma base visual do pagar</span>
        </div>
        <h2 className="page-title">{blueprint.title}</h2>
        <p className="page-subtitle">{blueprint.summary}</p>
      </section>

      <section className="section-grid section-grid--two">
        <ChecklistCard
          eyebrow="Escopo visual"
          title="UI que precisa nascer no web"
          text="A regra visual deve ser irma de contas a pagar, sem duplicar arquitetura."
          items={blueprint.uiSlices}
        />
        <ChecklistCard
          eyebrow="Contrato de API"
          title="Backend que essa tela espera"
          text="A diferenca principal e o tipo de transacao e os textos do fluxo."
          items={blueprint.apiContracts}
        />
      </section>

      <section className="section-grid section-grid--two">
        <ChecklistCard
          eyebrow="Pronto quando"
          title="Criterio de saida do legado"
          text="A migracao so vale quando a nova tela cobre os fluxos reais de recebimento."
          items={blueprint.doneCriteria}
        />
        <ChecklistCard
          eyebrow="Primeiro recorte"
          title="Entrega sugerida"
          text="Depois do pagar, esta tela reaproveita layout, componentes e estados de tabela."
          items={blueprint.firstDelivery}
        />
      </section>
    </div>
  );
}
