import Link from "next/link";
import { ArrowRight, Blocks, ShieldCheck, WalletCards } from "lucide-react";
import { ApiHealthPanel } from "@/src/components/admin/api-health-panel";
import { ChecklistCard } from "@/src/components/admin/checklist-card";
import { StatCard } from "@/src/components/admin/stat-card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { financeBlueprints } from "@/src/lib/finance-blueprints";

const foundationItems = [
  "Shell administrativo centralizado no Next.",
  "Sidebar e rotas iniciais do financeiro no novo padrao.",
  "Cliente HTTP preparado para consumir a API sem EJS.",
];

const nextActions = [
  "Definir autenticacao compartilhada entre web e api.",
  "Migrar a listagem de contas a pagar usando componentes React.",
  "Migrar a listagem de valores a receber com a mesma base visual.",
];

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden border-border/60 bg-card/80">
        <div className="absolute inset-0 bg-hero-grid opacity-[0.08]" />
        <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-0 top-10 h-48 w-48 rounded-full bg-warning/10 blur-3xl" />
        <CardContent className="relative grid gap-8 p-6 sm:p-8">
          <Badge className="w-fit gap-2">
            <Blocks className="size-3.5" />
            Foundations First
          </Badge>
          <div className="space-y-4">
            <h2 className="max-w-4xl font-display text-5xl leading-[0.92] tracking-[-0.09em] text-foreground sm:text-6xl">
              A mudanca comecou pela arquitetura, e agora o estilo tambem tem padrao.
            </h2>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              O novo fluxo ja nasce com o frontend dono da experiencia, o backend dono dos contratos e o `shadcn/ui`
              como base oficial de componentes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/app/finance">
                Abrir nucleo financeiro
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/migration">Ver roadmap</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-3">
        <StatCard eyebrow="Progresso" value="01" title="Slice ativo" note="Shell administrativo e contrato minimo com a API." />
        <StatCard eyebrow="Escopo" value="02" title="Modulos preparados" note="Contas a pagar e valores a receber ja tem rotas dedicadas." />
        <StatCard eyebrow="Padrao" value="UI" title="shadcn/ui oficial" note="A nova base de componentes ja virou o padrao do web." />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ApiHealthPanel />
        <ChecklistCard
          eyebrow="Fundacao pronta"
          title="O que ja esta armado"
          text="Essas pecas removem o atrito das proximas migracoes e evitam repetir o hibrido atual."
          items={foundationItems}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChecklistCard
          eyebrow="Proximos passos"
          title="Sequencia pragmatica"
          text="A ordem foi escolhida para viabilizar entrega real sem criar outra camada provisoria."
          items={nextActions}
        />

        <Card className="border-border/60 bg-card/75">
          <CardContent className="space-y-6 p-6">
            <div className="space-y-3">
              <Badge variant="outline" className="w-fit gap-2">
                <WalletCards className="size-3.5" />
                Financeiro
              </Badge>
              <div className="space-y-2">
                <h3 className="text-2xl font-semibold tracking-tight">Modulos ja posicionados</h3>
                <p className="text-sm leading-7 text-muted-foreground md:text-base">
                  As proximas entregas entram por estas rotas no frontend novo.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {financeBlueprints.map((module) => (
                <Button key={module.slug} asChild variant="outline" className="w-full justify-between rounded-[22px] px-5">
                  <Link href={module.href}>
                    <span>{module.title}</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              ))}
            </div>

            <div className="rounded-[24px] border border-success/20 bg-success/10 px-5 py-4 text-sm leading-7 text-success-foreground">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                <p>
                  O shell ja usa `Card`, `Badge` e `Button` do padrao `shadcn/ui`. Daqui para frente, tela nova deve
                  seguir essa base.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
