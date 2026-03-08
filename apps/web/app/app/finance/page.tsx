import { WalletCards } from "lucide-react";
import { ModuleCard } from "@/src/components/admin/module-card";
import { Badge } from "@/src/components/ui/badge";
import { financeBlueprints } from "@/src/lib/finance-blueprints";

export const metadata = {
  title: "Financeiro",
};

export default function FinanceHubPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <Badge className="w-fit gap-2">
          <WalletCards className="size-3.5" />
          Finance core
        </Badge>
        <div className="space-y-3">
          <h2 className="max-w-4xl font-display text-4xl leading-[0.95] tracking-[-0.08em] text-foreground sm:text-5xl">
            O financeiro sera o primeiro modulo completo fora do EJS.
          </h2>
          <p className="max-w-3xl text-base leading-8 text-muted-foreground">
            Aqui ficam as entradas do modulo e o escopo que cada tela precisa cumprir para a migracao ser definitiva.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {financeBlueprints.map((module) => (
          <ModuleCard key={module.slug} blueprint={module} />
        ))}
      </section>
    </div>
  );
}
