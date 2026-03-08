import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  FileText,
  Grid2x2,
  HandCoins,
  ReceiptText,
  Users,
} from "lucide-react";

export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  disabled?: boolean;
  match?: "exact" | "prefix";
  icon: LucideIcon;
};

export type AdminNavigationSection = {
  title?: string;
  items: AdminNavigationItem[];
};

export const adminNavigation: AdminNavigationSection[] = [
  {
    items: [
      {
        href: "/app",
        label: "Visao geral",
        description: "Resumo principal da operacao e ponto de entrada da nova base.",
        match: "exact",
        icon: Grid2x2,
      },
    ],
  },
  {
    title: "Emprestimos",
    items: [
      {
        href: "/app/carteira",
        label: "Painel da carteira",
        description: "Resumo operacional da carteira de emprestimos.",
        icon: BarChart3,
      },
      {
        href: "/app/clientes",
        label: "Clientes",
        description: "Cadastro e acompanhamento dos clientes.",
        icon: Users,
      },
      {
        href: "/app/emprestimos",
        label: "Emprestimos",
        description: "Gestao de contratos e novas operacoes.",
        icon: HandCoins,
      },
      {
        href: "/app/parcelas",
        label: "Parcelas",
        description: "Controle das parcelas geradas pelos emprestimos.",
        match: "prefix",
        icon: ReceiptText,
      },
      {
        href: "/app/relatorios",
        label: "Relatorios",
        description: "Relatorios do modulo de emprestimos.",
        icon: FileText,
      },
    ],
  },
  {
    title: "Financeiro",
    items: [
      {
        href: "/app/finance/payables",
        label: "Contas a pagar",
        description: "Saidas financeiras, compromissos e vencimentos.",
        match: "prefix",
        icon: ArrowUpFromLine,
      },
      {
        href: "/app/finance/receivables",
        label: "Contas a receber",
        description: "Entradas previstas, recebimentos e baixas.",
        match: "prefix",
        icon: ArrowDownToLine,
      },
      {
        href: "/app/finance/relatorios",
        label: "Relatorios",
        description: "Relatorios consolidados do financeiro.",
        disabled: true,
        icon: FileText,
      },
    ],
  },
];
