import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarCheck2,
  ChartColumn,
  FileBarChart2,
  LayoutGrid,
  HandCoins,
  Users,
} from "lucide-react";
import type { LegacyNavigationSection } from "./types";

export const legacyDefaultNavigation: LegacyNavigationSection[] = [
  {
    id: "overview",
    items: [
      {
        id: "visao-geral",
        label: "Visao geral",
        href: "/app/visao-geral",
        icon: LayoutGrid,
      },
    ],
  },
  {
    id: "loans",
    title: "Emprestimos",
    items: [
      {
        id: "dashboard",
        label: "Painel da carteira",
        href: "/dashboard.html",
        icon: ChartColumn,
      },
      {
        id: "debtors",
        label: "Clientes",
        href: "/debtors.html",
        icon: Users,
      },
      {
        id: "loans-list",
        label: "Emprestimos",
        href: "/loans.html",
        icon: HandCoins,
      },
      {
        id: "installments",
        label: "Parcelas",
        href: "/installments.html",
        icon: CalendarCheck2,
      },
      {
        id: "reports",
        label: "Relatorios",
        href: "/reports.html",
        icon: FileBarChart2,
      },
    ],
  },
  {
    id: "finance",
    title: "Financeiro",
    items: [
      {
        id: "payables",
        label: "Contas a pagar",
        href: "/admin/contas-a-pagar.html",
        icon: ArrowDownLeft,
        tone: "danger",
      },
      {
        id: "receivables",
        label: "Contas a receber",
        href: "/admin/contas-a-receber.html",
        icon: ArrowUpRight,
        tone: "success",
      },
      {
        id: "finance-reports",
        label: "Relatorios",
        href: "/admin/finance-reports.html",
        icon: FileBarChart2,
      },
    ],
  },
];
