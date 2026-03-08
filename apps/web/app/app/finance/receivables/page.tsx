import { ArrowDownToLine } from "lucide-react";
import { ChecklistCard } from "@/src/components/admin/checklist-card";
import { Badge } from "@/src/components/ui/badge";
import { getFinanceBlueprint } from "@/src/lib/finance-blueprints";

export const metadata = {
  title: "Valores a Receber",
};

const blueprint = getFinanceBlueprint("receivables");

export default function ReceivablesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="gap-2">
            <ArrowDownToLine className="size-3.5" />
            {blueprint.kicker}
          </Badge>
          <Badge variant="success">Mesma base visual do pagar</Badge>
        </div>
        <div className="space-y-3">
          <h2 className="max-w-4xl font-display text-4xl leading-[0.95] tracking-[-0.08em] text-foreground sm:text-5xl">
            {blueprint.title}
          </h2>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">{blueprint.summary}</p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
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

      <section className="grid gap-4 xl:grid-cols-2">
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
