import { Milestone, Shield } from "lucide-react";
import { ChecklistCard } from "@/src/components/admin/checklist-card";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { roadmapPhases, standardRules } from "@/src/lib/migration-roadmap";

export const metadata = {
  title: "Migracao",
};

export default function MigrationPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Badge className="w-fit gap-2">
          <Milestone className="size-3.5" />
          Refactor roadmap
        </Badge>
        <div className="space-y-3">
          <h2 className="max-w-4xl font-display text-4xl leading-[0.95] tracking-[-0.08em] text-foreground sm:text-5xl">
            Plano de migracao com dono claro para cada camada.
          </h2>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">
            O objetivo nao e reescrever tudo de uma vez. E migrar modulo por modulo ate o legado deixar de ser a
            origem principal do sistema.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {roadmapPhases.map((phase) => (
          <ChecklistCard
            key={phase.title}
            eyebrow={phase.eyebrow}
            title={phase.title}
            text={phase.text}
            items={phase.items}
          />
        ))}
      </section>

      <Card className="border-border/60 bg-card/75">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit gap-2">
            <Shield className="size-3.5" />
            Regras do padrao
          </Badge>
          <CardTitle className="max-w-3xl font-display text-3xl leading-[0.98] tracking-[-0.06em] sm:text-4xl">
            Decisoes que nao devem mais voltar ao estado hibrido.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {standardRules.map((rule) => (
              <div
                key={rule}
                className="rounded-[24px] border border-border/60 bg-background/35 px-5 py-4 text-sm leading-7 text-muted-foreground"
              >
                {rule}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
