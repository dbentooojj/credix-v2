export type AdminNavigationItem = {
  href: string;
  label: string;
  description: string;
  match?: "exact" | "prefix";
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
      },
      {
        href: "/app/migration",
        label: "Migracao",
        description: "Roadmap, regras de padrao e sequencia de execucao.",
        match: "exact",
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
      },
      {
        href: "/app/finance/payables",
        label: "Contas a pagar",
        description: "Primeira tela a ser reimplementada no Next.",
        match: "prefix",
      },
      {
        href: "/app/finance/receivables",
        label: "Valores a receber",
        description: "Tela irma com mesma base visual e contrato alinhado.",
        match: "prefix",
      },
    ],
  },
];
