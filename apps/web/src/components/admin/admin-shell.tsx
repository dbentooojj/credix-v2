"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, CircleHelp, IdCard, LogOut, Menu, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { CredixWordmark } from "@/src/components/admin/credix-wordmark";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { adminNavigation } from "@/src/lib/navigation";
import { clearStoredSessionUser, getFallbackSessionUser, readSessionUser, type SessionUser } from "@/src/lib/session-user";
import { cn } from "@/src/lib/utils";
import styles from "@/src/components/admin/admin-shell.module.css";

type AdminShellProps = {
  children: ReactNode;
};

const DESKTOP_MEDIA_QUERY = "(min-width: 1025px)";

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "AD";
}

function formatRoleLabel(role: string) {
  return role
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Administrador";
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const [isDesktopViewport, setIsDesktopViewport] = useState(false);
  const [user, setUser] = useState<SessionUser>(() => getFallbackSessionUser());

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncViewport = () => {
      const desktop = mediaQuery.matches;
      setIsDesktopViewport(desktop);

      if (desktop) {
        setMobileSidebarOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener("change", syncViewport);
    return () => mediaQuery.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const syncUser = () => setUser(readSessionUser());

    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  useEffect(() => {
    if (!isDesktopViewport) {
      setMobileSidebarOpen(false);
    }
  }, [pathname, isDesktopViewport]);

  const sidebarVisible = isDesktopViewport ? !desktopSidebarCollapsed : mobileSidebarOpen;
  const userInitials = getInitials(user.name);
  const userRoleLabel = formatRoleLabel(user.role);

  function handleSidebarToggle() {
    if (isDesktopViewport) {
      setDesktopSidebarCollapsed((current) => !current);
      return;
    }

    setMobileSidebarOpen((current) => !current);
  }

  function handleSignOut() {
    clearStoredSessionUser();
    setUser(getFallbackSessionUser());
  }

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerBrand}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={styles.menuButton}
              onClick={handleSidebarToggle}
            >
              <Menu className="size-5" />
              <span className="sr-only">Alternar menu lateral</span>
            </Button>

            <Link href="/app" className={styles.brandLink} aria-label="Credix">
              <CredixWordmark />
            </Link>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className={cn(styles.userTrigger, "font-menu")}>
                <span className={styles.userAvatar} aria-hidden="true">{userInitials}</span>
                <span className={styles.userMeta}>
                  <span className={styles.userLabel}>Ola, {user.name}</span>
                  <span className={styles.userRole}>{userRoleLabel}</span>
                </span>
                <ChevronDown className={cn("size-4", styles.userChevron)} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Sessao atual</DropdownMenuLabel>
              <div className={styles.userMenuCard}>
                <span className={styles.userMenuAvatar} aria-hidden="true">{userInitials}</span>
                <div className={styles.userMenuContent}>
                  <p className={styles.userMenuName}>{user.name}</p>
                  <p className={styles.userMenuEmail}>{user.email}</p>
                  <p className={styles.userMenuHint}>
                    {user.source === "storage" ? "Usuario carregado da sessao local." : "Sessao local padrao do V2."}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <IdCard className="size-4" />
                Meu perfil
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <ShieldCheck className="size-4" />
                Seguranca
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <CircleHelp className="size-4" />
                Ajuda
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-rose-300 focus:bg-rose-950/40 focus:text-rose-100"
                disabled={user.source !== "storage"}
                onSelect={handleSignOut}
              >
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {!isDesktopViewport && mobileSidebarOpen ? (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Fechar menu lateral"
        />
      ) : null}

      <aside className={cn(styles.sidebar, sidebarVisible ? styles.sidebarOpen : styles.sidebarHidden)}>
        <nav className={styles.sidebarScroll} aria-label="Navegacao principal">
          {adminNavigation.map((section, sectionIndex) => (
            <section key={`${section.title ?? "geral"}-${sectionIndex}`} className={styles.sidebarSection}>
              {section.title ? <h2 className={styles.sidebarTitle}>{section.title}</h2> : null}
              <div className={styles.sidebarMenu}>
                {section.items.map((item) => {
                  const isActive = !item.disabled && (item.match === "prefix"
                    ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                    : pathname === item.href);
                  const Icon = item.icon;
                  const toneClass = item.href.includes("/payables")
                    ? styles.sidebarItemDanger
                    : item.href.includes("/receivables")
                      ? styles.sidebarItemSuccess
                      : "";
                  const itemClassName = cn(
                    styles.sidebarItem,
                    item.disabled && styles.sidebarItemDisabled,
                    toneClass,
                    isActive && styles.sidebarItemActive,
                  );

                  if (item.disabled) {
                    return (
                      <div
                        key={item.href}
                        className={itemClassName}
                        aria-disabled="true"
                        title={`${item.label} ainda nao foi migrado`}
                      >
                        <span className={styles.sidebarIcon}>
                          <Icon className="size-4" />
                        </span>
                        <span className={styles.sidebarItemLabel}>{item.label}</span>
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={itemClassName}
                    >
                      <span className={styles.sidebarIcon}>
                        <Icon className="size-4" />
                      </span>
                      <span className={styles.sidebarItemLabel}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <main className={cn(styles.main, sidebarVisible && isDesktopViewport && styles.mainWithSidebar)}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
