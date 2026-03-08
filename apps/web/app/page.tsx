const phases = [
  {
    title: "Fase 1",
    text: "Definir autenticacao, layout base e contratos entre web e api.",
  },
  {
    title: "Fase 2",
    text: "Migrar financeiro: contas a pagar, valores a receber e relatorios.",
  },
  {
    title: "Fase 3",
    text: "Migrar clientes, emprestimos e parcelas ate desligar o legado.",
  },
];

export default function HomePage() {
  return (
    <main
      style={{
        maxWidth: 1120,
        margin: "0 auto",
        padding: "72px 24px 96px",
      }}
    >
      <section
        style={{
          display: "grid",
          gap: 20,
          padding: 28,
          border: "1px solid var(--panel-border)",
          borderRadius: 28,
          background: "var(--panel)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.35)",
        }}
      >
        <span
          style={{
            width: "fit-content",
            padding: "8px 12px",
            borderRadius: 999,
            background: "var(--brand-soft)",
            color: "#bfd7ff",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Nova base
        </span>
        <div style={{ display: "grid", gap: 12 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2.5rem, 5vw, 4.75rem)",
              lineHeight: 1,
              letterSpacing: "-0.05em",
            }}
          >
            Credix V2
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 720,
              color: "var(--muted)",
              fontSize: 18,
              lineHeight: 1.7,
            }}
          >
            Backend focado em API. Frontend focado em experiencia, componentes e padrao visual.
          </p>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        <Card title="API only" text="Nada de HTML no backend. Apenas auth, regra de negocio e contratos HTTP." />
        <Card title="Web unico" text="Toda tela nova nasce no Next, com componentes reutilizaveis e layout consistente." />
        <Card title="Migracao por modulo" text="Cada fluxo sai do legado completo, sem manter duas fontes de verdade." />
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 style={{ margin: 0, fontSize: 28, letterSpacing: "-0.03em" }}>Plano inicial</h2>
        <div
          style={{
            display: "grid",
            gap: 16,
            marginTop: 18,
          }}
        >
          {phases.map((phase) => (
            <article
              key={phase.title}
              style={{
                padding: 20,
                border: "1px solid var(--panel-border)",
                borderRadius: 22,
                background: "rgba(7, 17, 31, 0.76)",
              }}
            >
              <strong style={{ display: "block", fontSize: 18 }}>{phase.title}</strong>
              <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{phase.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <article
      style={{
        padding: 20,
        border: "1px solid var(--panel-border)",
        borderRadius: 22,
        background: "rgba(7, 17, 31, 0.76)",
      }}
    >
      <strong style={{ display: "block", fontSize: 18 }}>{title}</strong>
      <p style={{ margin: "10px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>{text}</p>
    </article>
  );
}
