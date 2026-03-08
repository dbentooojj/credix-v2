import { ArrowUpFromLine } from "lucide-react";
import { ChecklistCard } from "@/src/components/admin/checklist-card";
import { Badge } from "@/src/components/ui/badge";
import { getFinanceBlueprint } from "@/src/lib/finance-blueprints";

export const metadata = {
  title: "Contas a Pagar",
};

const blueprint = getFinanceBlueprint("payables");

export default function PayablesPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="gap-2">
            <ArrowUpFromLine className="size-3.5" />
            {blueprint.kicker}
          </Badge>
          <Badge variant="warning">Proxima implementacao</Badge>
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

      <section className="grid gap-4 xl:grid-cols-2">
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
