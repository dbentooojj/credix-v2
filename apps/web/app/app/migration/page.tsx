import { ChecklistCard } from "../../../src/components/admin/checklist-card";
import { roadmapPhases, standardRules } from "../../../src/lib/migration-roadmap";

export const metadata = {
  title: "Migracao",
};

export default function MigrationPage() {
  return (
    <div className="page-stack">
      <section className="page-header">
        <span className="eyebrow">Refactor Roadmap</span>
        <h2 className="page-title">Plano de migracao com dono claro para cada camada.</h2>
        <p className="page-subtitle">
          O objetivo nao e reescrever tudo de uma vez. E migrar modulo por modulo ate o legado deixar de ser a
          origem principal do sistema.
        </p>
      </section>

      <section className="section-grid section-grid--two">
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

      <section className="surface" style={{ padding: 26 }}>
        <div className="page-header">
          <span className="eyebrow">Regras do padrao</span>
          <h3 className="page-title" style={{ fontSize: "clamp(1.8rem, 3vw, 2.6rem)" }}>
            Decisoes que nao devem mais voltar ao estado hibrido.
          </h3>
        </div>
        <ul className="checklist">
          {standardRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
