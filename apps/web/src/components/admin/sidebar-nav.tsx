"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AdminNavigationSection } from "../../lib/navigation";

type SidebarNavProps = {
  sections: AdminNavigationSection[];
};

export function SidebarNav({ sections }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav-section" aria-label="Navegacao principal">
      {sections.map((section) => (
        <div key={section.title} className="nav-section">
          <p className="nav-section__title">{section.title}</p>
          <div className="nav-list">
            {section.items.map((item) => {
              const isActive = item.match === "prefix"
                ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                : pathname === item.href;

              return (
                <Link key={item.href} href={item.href} className={`nav-link${isActive ? " is-active" : ""}`}>
                  <span className="nav-link__label">{item.label}</span>
                  <span className="nav-link__description">{item.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
