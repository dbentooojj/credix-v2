import Link from "next/link";
import type { FinanceBlueprint } from "../../lib/finance-blueprints";

type ModuleCardProps = {
  blueprint: FinanceBlueprint;
};

export function ModuleCard({ blueprint }: ModuleCardProps) {
  return (
    <article className="card">
      <div className="status-row">
        <span className="chip chip--brand">{blueprint.kicker}</span>
        <span className={blueprint.statusTone === "success" ? "chip chip--success" : "chip chip--warning"}>
          {blueprint.statusLabel}
        </span>
      </div>
      <div>
        <h3 className="card__title">{blueprint.title}</h3>
        <p className="card__text">{blueprint.summary}</p>
      </div>
      <ul className="checklist">
        {blueprint.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="card__footer">
        <Link href={blueprint.href} className="route-link">
          Abrir escopo do modulo
        </Link>
      </div>
    </article>
  );
}
