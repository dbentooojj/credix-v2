import type { ReactNode } from "react";
import Link from "next/link";
import { SidebarNav } from "../../src/components/admin/sidebar-nav";
import { adminNavigation } from "../../src/lib/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell-layout">
      <div className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <span className="admin-brand__badge">Migration Track</span>
            <div>
              <h1 className="admin-brand__title">Credix V2</h1>
              <p className="admin-brand__text">
                API pura no backend. Interface e experiencia concentradas no frontend.
              </p>
            </div>
          </div>

          <SidebarNav sections={adminNavigation} />

          <div className="card">
            <p className="card__eyebrow">Principio ativo</p>
            <strong className="card__title">Nada de tela nova no legado</strong>
            <p className="card__text">
              Cada nova entrega deve nascer no <span className="muted-code">apps/web</span> e consumir apenas a API
              em <span className="muted-code">apps/api</span>.
            </p>
          </div>
        </aside>

        <main className="admin-main">
          <header className="topbar">
            <div>
              <p className="topbar__title">Shell administrativo da nova base</p>
              <p className="topbar__text">
                Primeiro slice: navegacao, fundacao visual e integracao minima com a API.
              </p>
            </div>
            <div className="topbar__actions">
              <span className="chip chip--success">Web padronizado</span>
              <Link className="route-link" href="/app/migration">
                Ver plano de migracao
              </Link>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
