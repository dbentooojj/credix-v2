import Link from "next/link";
import { cn } from "@/src/lib/utils";
import type { LegacyNavigationSection } from "./types";

type LegacyMigrationSidebarProps = {
  sections: LegacyNavigationSection[];
  activePathname: string;
  className?: string;
  onNavigate?: () => void;
};

function isItemActive(pathname: string, href: string) {
  if (href === "/app/visao-geral") {
    return pathname === "/app" || pathname === "/app/visao-geral";
  }
  return pathname === href;
}

function getItemClasses(active: boolean, tone: "default" | "success" | "danger" = "default") {
  if (active) {
    return "border border-lm-primary-strong/60 bg-[linear-gradient(135deg,rgba(124,58,237,0.42),rgba(124,58,237,0.22))] text-lm-text";
  }

  if (tone === "success") {
    return "text-lm-positive hover:text-lm-text hover:bg-lm-card";
  }

  if (tone === "danger") {
    return "text-lm-negative hover:text-lm-text hover:bg-lm-card";
  }

  return "text-lm-text-muted hover:text-lm-text hover:bg-lm-card";
}

export function LegacyMigrationSidebar({
  sections,
  activePathname,
  className,
  onNavigate,
}: LegacyMigrationSidebarProps) {
  return (
    <aside
      className={cn(
        "h-full w-64 border-r border-lm-border bg-lm-sidebar",
        className,
      )}
    >
      <nav aria-label="Navegacao principal" className="h-full overflow-y-auto px-4 py-4">
        {sections.map((section) => (
          <section className="mt-5 first:mt-0" key={section.id}>
            {section.title ? (
              <h3 className="mb-2 px-2 text-[0.62rem] font-extrabold uppercase tracking-[0.2em] text-lm-text-subtle">
                {section.title}
              </h3>
            ) : null}

            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isItemActive(activePathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    className={cn(
                      "group flex min-h-[42px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition",
                      getItemClasses(active, item.tone),
                    )}
                    href={item.href}
                    key={item.id}
                    onClick={onNavigate}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-lm-text" : "text-lm-text-subtle group-hover:text-lm-text-muted",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </aside>
  );
}
