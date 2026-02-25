const legacyLinks = [
  { label: "Login", href: "/login" },
  { label: "Painel Financeiro", href: "/admin/dashboard.html" },
  { label: "Clientes", href: "/admin/debtors.html" },
  { label: "Emprestimos", href: "/admin/loans.html" },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300">Credix</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Frontend separado com Next.js</h1>
        <p className="mt-4 max-w-3xl text-sm text-slate-300">
          Esta base do frontend foi criada na Parte 1. As telas atuais seguem sendo servidas pelo backend para evitar
          regressao durante a migracao.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {legacyLinks.map((item) => (
            <a
              key={item.href}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-100 transition hover:border-amber-300 hover:text-amber-200"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
