import { ModuleCard } from "../../../src/components/admin/module-card";
import { financeBlueprints } from "../../../src/lib/finance-blueprints";

export const metadata = {
  title: "Financeiro",
};

export default function FinanceHubPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="eyebrow">Finance Core</span>
        <h2 className="page-title">O financeiro sera o primeiro modulo completo fora do EJS.</h2>
        <p className="page-subtitle">
          Aqui ficam as entradas do modulo e o escopo que cada tela precisa cumprir para a migracao ser definitiva.
        </p>
      </section>

      <section className="section-grid section-grid--two">
        {financeBlueprints.map((module) => (
          <ModuleCard key={module.slug} blueprint={module} />
        ))}
      </section>
    </div>
  );
}
