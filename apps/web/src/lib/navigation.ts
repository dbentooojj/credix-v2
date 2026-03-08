import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  LayoutDashboard,
  Milestone,
  WalletCards,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  match?: "exact" | "prefix";
  icon: LucideIcon;
};

export type AdminNavigationSection = {
  title: string;
  items: AdminNavigationItem[];
};

export const adminNavigation: AdminNavigationSection[] = [
  {
    title: "Centro",
    items: [
      {
        href: "/app",
        label: "Overview",
        description: "Visao da nova base e dos slices em andamento.",
        match: "exact",
        icon: LayoutDashboard,
      },
      {
        href: "/app/migration",
        label: "Migracao",
        description: "Roadmap, regras de padrao e sequencia de execucao.",
        match: "exact",
        icon: Milestone,
      },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        href: "/app/finance",
        label: "Nucleo financeiro",
        description: "Entrada do primeiro modulo a sair do legado.",
        match: "exact",
        icon: WalletCards,
      },
      {
        href: "/app/finance/payables",
        label: "Contas a pagar",
        description: "Primeira tela a ser reimplementada no Next.",
        match: "prefix",
        icon: ArrowUpFromLine,
      },
      {
        href: "/app/finance/receivables",
        label: "Valores a receber",
        description: "Tela irma com mesma base visual e contrato alinhado.",
        match: "prefix",
        icon: ArrowDownToLine,
      },
    ],
  },
];
