import Link from "next/link";
import { ApiHealthPanel } from "../../src/components/admin/api-health-panel";
import { ChecklistCard } from "../../src/components/admin/checklist-card";
import { StatCard } from "../../src/components/admin/stat-card";
import { financeBlueprints } from "../../src/lib/finance-blueprints";

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
    <div className="page-stack">
      <section className="surface surface--hero">
        <div className="hero-grid">
          <span className="eyebrow">Foundations First</span>
          <h2 className="hero-title">A mudanca comecou pela arquitetura, nao por gambiarra de tela.</h2>
          <p className="hero-text">
            O novo fluxo ja nasce com o frontend dono da experiencia e o backend dono dos contratos. A partir daqui,
            cada modulo sai do legado com responsabilidade clara.
          </p>
          <div className="cluster">
            <Link className="route-link" href="/app/finance">
              Abrir nucleo financeiro
            </Link>
            <Link className="route-link" href="/app/migration">
              Ver roadmap
            </Link>
          </div>
        </div>
      </section>

      <section className="section-grid section-grid--three">
        <StatCard eyebrow="Progresso" value="01" title="Slice ativo" note="Shell administrativo e contrato minimo com a API." />
        <StatCard eyebrow="Escopo" value="02" title="Modulos preparados" note="Contas a pagar e valores a receber ja tem rotas dedicadas." />
        <StatCard eyebrow="Padrao" value="100%" title="Frontend no web" note="Nenhuma tela nova foi criada no backend legado." />
      </section>

      <section className="section-grid section-grid--two">
        <ApiHealthPanel />
        <ChecklistCard
          eyebrow="Fundacao pronta"
          title="O que ja esta armado"
          text="Essas pecas removem o atrito das proximas migracoes e evitam repetir o hibrido atual."
          items={foundationItems}
        />
      </section>

      <section className="section-grid section-grid--two">
        <ChecklistCard
          eyebrow="Proximos passos"
          title="Sequencia pragmatica"
          text="A ordem foi escolhida para viabilizar entrega real sem criar outra camada provisoria."
          items={nextActions}
        />

        <div className="card">
          <p className="card__eyebrow">Financeiro</p>
          <h3 className="card__title">Modulos ja posicionados</h3>
          <p className="card__text">As proximas entregas entram por estas rotas no frontend novo.</p>
          <div className="section-stack">
            {financeBlueprints.map((module) => (
              <Link key={module.slug} href={module.href} className="route-link">
                {module.title}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
