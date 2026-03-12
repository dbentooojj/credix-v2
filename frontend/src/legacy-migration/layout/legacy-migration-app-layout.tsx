"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/src/lib/utils";
import { LegacyMigrationShell } from "./legacy-migration-shell";
import { LegacyMigrationHeader } from "./legacy-migration-header";
import { LegacyMigrationSidebar } from "./legacy-migration-sidebar";
import { legacyDefaultNavigation } from "./navigation";
import type { LegacyNavigationSection } from "./types";

type LegacyMigrationAppLayoutProps = {
  children: ReactNode;
  navigation?: LegacyNavigationSection[];
  userName?: string;
};

export function LegacyMigrationAppLayout({
  children,
  navigation = legacyDefaultNavigation,
  userName,
}: LegacyMigrationAppLayoutProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);

  function handleSidebarToggle() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setDesktopSidebarCollapsed((current) => !current);
      return;
    }
    setMobileSidebarOpen((current) => !current);
  }

  return (
    <LegacyMigrationShell>
      <LegacyMigrationHeader onMenuToggle={handleSidebarToggle} userName={userName} />

      <div className="pt-16 sm:pt-20">
        <button
          aria-label="Fechar menu lateral"
          className={cn(
            "fixed inset-0 z-30 bg-black/50 transition lg:hidden",
            mobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={() => setMobileSidebarOpen(false)}
          type="button"
        />

        <div
          className={cn(
            "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] transition-transform sm:top-20 sm:h-[calc(100vh-5rem)]",
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            desktopSidebarCollapsed ? "lg:-translate-x-full" : "",
          )}
        >
          <LegacyMigrationSidebar
            activePathname={pathname}
            onNavigate={() => setMobileSidebarOpen(false)}
            sections={navigation}
          />
        </div>

        <div className={cn("transition-[padding] duration-150", desktopSidebarCollapsed ? "lg:pl-0" : "lg:pl-64")}>
          <main className="min-h-[calc(100vh-4rem)] p-4 sm:min-h-[calc(100vh-5rem)] sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </LegacyMigrationShell>
  );
}
