export type PortfolioLoan = {
  id: string;
  customerName: string;
  principalAmount: number;
  issuedAt: string;
  firstDueDate: string;
  interestType: PortfolioLoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number;
  observations: string;
};

export type PortfolioInstallmentStatus = "pending" | "completed";

export type PortfolioInstallment = {
  id: string;
  loanId: string;
  customerName: string;
  installmentNumber: number;
  totalInstallments: number;
  dueDate: string;
  paidDate: string | null;
  principalAmount: number;
  interestAmount: number;
  amount: number;
  status: PortfolioInstallmentStatus;
};

export type PortfolioLoanSimulationStatus = "DRAFT" | "SENT" | "ACCEPTED" | "EXPIRED" | "CANCELED";
export type PortfolioLoanSimulationInterestType = "simples" | "composto" | "fixo";

export type PortfolioLoanSimulation = {
  id: string;
  customerName: string;
  principalAmount: number;
  totalAmount: number;
  installmentsCount: number;
  interestType: PortfolioLoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number;
  status: PortfolioLoanSimulationStatus;
  expiresAt: string;
};

type LoanSeed = {
  id: string;
  customerName: string;
  principalAmount: number;
  issuedOffset: number;
  installments: Array<{
    dueOffset: number;
    paidOffset?: number;
    principalAmount: number;
    interestAmount: number;
    status: PortfolioInstallmentStatus;
  }>;
};

type LoanSimulationSeed = {
  id: string;
  customerName: string;
  principalAmount: number;
  totalAmount: number;
  installmentsCount: number;
  interestType: PortfolioLoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number;
  status: PortfolioLoanSimulationStatus;
  expiresOffset: number;
};

const DEFAULT_TIMEZONE = "America/Sao_Paulo";

function formatDateOnly(date: Date, timeZone = DEFAULT_TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value || "1970";
  const month = parts.find((part) => part.type === "month")?.value || "01";
  const day = parts.find((part) => part.type === "day")?.value || "01";

  return `${year}-${month}-${day}`;
}

function shiftDays(diff: number) {
  const next = new Date();
  next.setDate(next.getDate() + diff);
  return formatDateOnly(next);
}

const loanSeeds: LoanSeed[] = [
  {
    id: "2001",
    customerName: "Ana Martins",
    principalAmount: 4500,
    issuedOffset: -78,
    installments: [
      { dueOffset: -42, paidOffset: -40, principalAmount: 1125, interestAmount: 225, status: "completed" },
      { dueOffset: -10, principalAmount: 1125, interestAmount: 225, status: "pending" },
      { dueOffset: 20, principalAmount: 1125, interestAmount: 225, status: "pending" },
      { dueOffset: 50, principalAmount: 1125, interestAmount: 225, status: "pending" },
    ],
  },
  {
    id: "2002",
    customerName: "Bruno Costa",
    principalAmount: 3200,
    issuedOffset: -55,
    installments: [
      { dueOffset: -25, paidOffset: -24, principalAmount: 800, interestAmount: 176, status: "completed" },
      { dueOffset: -1, paidOffset: -1, principalAmount: 800, interestAmount: 176, status: "completed" },
      { dueOffset: 0, principalAmount: 800, interestAmount: 176, status: "pending" },
      { dueOffset: 29, principalAmount: 800, interestAmount: 176, status: "pending" },
    ],
  },
  {
    id: "2003",
    customerName: "Carla Souza",
    principalAmount: 2800,
    issuedOffset: -46,
    installments: [
      { dueOffset: -16, principalAmount: 560, interestAmount: 140, status: "pending" },
      { dueOffset: 7, principalAmount: 560, interestAmount: 140, status: "pending" },
      { dueOffset: 37, principalAmount: 560, interestAmount: 140, status: "pending" },
      { dueOffset: 67, principalAmount: 560, interestAmount: 140, status: "pending" },
      { dueOffset: 97, principalAmount: 560, interestAmount: 140, status: "pending" },
    ],
  },
  {
    id: "2004",
    customerName: "Diego Lima",
    principalAmount: 6000,
    issuedOffset: -180,
    installments: [
      { dueOffset: -150, paidOffset: -149, principalAmount: 1000, interestAmount: 260, status: "completed" },
      { dueOffset: -120, paidOffset: -119, principalAmount: 1000, interestAmount: 260, status: "completed" },
      { dueOffset: -90, paidOffset: -89, principalAmount: 1000, interestAmount: 260, status: "completed" },
      { dueOffset: -60, paidOffset: -59, principalAmount: 1000, interestAmount: 260, status: "completed" },
      { dueOffset: -30, paidOffset: -28, principalAmount: 1000, interestAmount: 260, status: "completed" },
      { dueOffset: -2, paidOffset: -2, principalAmount: 1000, interestAmount: 260, status: "completed" },
    ],
  },
  {
    id: "2005",
    customerName: "Elisa Melo",
    principalAmount: 5200,
    issuedOffset: -92,
    installments: [
      { dueOffset: -32, paidOffset: -31, principalAmount: 1040, interestAmount: 260, status: "completed" },
      { dueOffset: -2, principalAmount: 1040, interestAmount: 260, status: "pending" },
      { dueOffset: 28, principalAmount: 1040, interestAmount: 260, status: "pending" },
      { dueOffset: 58, principalAmount: 1040, interestAmount: 260, status: "pending" },
      { dueOffset: 88, principalAmount: 1040, interestAmount: 260, status: "pending" },
    ],
  },
];

const loanSimulationSeeds: LoanSimulationSeed[] = [
  {
    id: "sim-3001",
    customerName: "Fernanda Rocha",
    principalAmount: 3800,
    totalAmount: 4600,
    installmentsCount: 5,
    interestType: "composto",
    interestRate: 21.05,
    fixedFeeAmount: 0,
    status: "DRAFT",
    expiresOffset: 5,
  },
  {
    id: "sim-3002",
    customerName: "Gabriel Nunes",
    principalAmount: 2500,
    totalAmount: 3025,
    installmentsCount: 4,
    interestType: "simples",
    interestRate: 21,
    fixedFeeAmount: 0,
    status: "SENT",
    expiresOffset: 2,
  },
  {
    id: "sim-3003",
    customerName: "Helena Duarte",
    principalAmount: 4200,
    totalAmount: 5150,
    installmentsCount: 6,
    interestType: "fixo",
    interestRate: 0,
    fixedFeeAmount: 950,
    status: "EXPIRED",
    expiresOffset: -1,
  },
  {
    id: "sim-3004",
    customerName: "Igor Mendes",
    principalAmount: 3100,
    totalAmount: 3658,
    installmentsCount: 4,
    interestType: "composto",
    interestRate: 18,
    fixedFeeAmount: 0,
    status: "ACCEPTED",
    expiresOffset: -4,
  },
  {
    id: "sim-3005",
    customerName: "Juliana Campos",
    principalAmount: 5600,
    totalAmount: 6720,
    installmentsCount: 8,
    interestType: "simples",
    interestRate: 20,
    fixedFeeAmount: 0,
    status: "CANCELED",
    expiresOffset: 3,
  },
];

const loans: PortfolioLoan[] = loanSeeds.map((loan) => ({
  id: loan.id,
  customerName: loan.customerName,
  principalAmount: loan.principalAmount,
  issuedAt: shiftDays(loan.issuedOffset),
  firstDueDate: shiftDays(loan.installments[0]?.dueOffset ?? 0),
  interestType: "composto",
  interestRate: loan.principalAmount > 0
    ? Number(((loan.installments.reduce((total, item) => total + item.interestAmount, 0) / loan.principalAmount) * 100).toFixed(2))
    : 0,
  fixedFeeAmount: 0,
  observations: "",
}));

let installments: PortfolioInstallment[] = loanSeeds.flatMap((loan) =>
  loan.installments.map((installment, index) => ({
    id: `${loan.id}-${index + 1}`,
    loanId: loan.id,
    customerName: loan.customerName,
    installmentNumber: index + 1,
    totalInstallments: loan.installments.length,
    dueDate: shiftDays(installment.dueOffset),
    paidDate: installment.paidOffset === undefined ? null : shiftDays(installment.paidOffset),
    principalAmount: installment.principalAmount,
    interestAmount: installment.interestAmount,
    amount: installment.principalAmount + installment.interestAmount,
    status: installment.status,
  })),
);

const loanSimulations: PortfolioLoanSimulation[] = loanSimulationSeeds.map((simulation) => ({
  id: simulation.id,
  customerName: simulation.customerName,
  principalAmount: simulation.principalAmount,
  totalAmount: simulation.totalAmount,
  installmentsCount: simulation.installmentsCount,
  interestType: simulation.interestType,
  interestRate: simulation.interestRate,
  fixedFeeAmount: simulation.fixedFeeAmount,
  status: simulation.status,
  expiresAt: `${shiftDays(simulation.expiresOffset)}T12:00:00.000Z`,
}));

export function listStoredPortfolioLoans() {
  return [...loans];
}

export function listStoredPortfolioInstallments() {
  return [...installments];
}

export function listStoredPortfolioLoanSimulations() {
  return [...loanSimulations];
}

export function createStoredPortfolioLoan(payload: Omit<PortfolioLoan, "id">) {
  const nextNumericId = loans.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), 2000) + 1;
  const created: PortfolioLoan = {
    id: String(nextNumericId),
    ...payload,
  };

  loans.unshift(created);
  return created;
}

export function updateStoredPortfolioLoan(id: string, payload: Partial<Omit<PortfolioLoan, "id">>) {
  const index = loans.findIndex((item) => item.id === id);
  if (index === -1) return null;

  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<Omit<PortfolioLoan, "id">>;

  const updated: PortfolioLoan = {
    ...loans[index],
    ...sanitizedPayload,
  };

  loans.splice(index, 1, updated);
  return updated;
}

export function replaceStoredPortfolioLoanInstallments(
  loanId: string,
  customerName: string,
  nextInstallments: Array<{
    amount: number;
    dueDate: string;
    interestAmount: number;
    paidDate?: string | null;
    principalAmount: number;
    status: PortfolioInstallmentStatus;
  }>,
) {
  installments = installments.filter((item) => item.loanId !== loanId);

  const created = nextInstallments.map((installment, index) => ({
    id: `${loanId}-${index + 1}`,
    loanId,
    customerName,
    installmentNumber: index + 1,
    totalInstallments: nextInstallments.length,
    dueDate: installment.dueDate,
    paidDate: installment.paidDate ?? null,
    principalAmount: installment.principalAmount,
    interestAmount: installment.interestAmount,
    amount: installment.amount,
    status: installment.status,
  }));

  installments = [...created, ...installments];
  return created;
}

export function updateStoredPortfolioInstallment(
  id: string,
  payload: Partial<Omit<PortfolioInstallment, "id" | "loanId" | "customerName" | "installmentNumber" | "totalInstallments">>,
) {
  const currentIndex = installments.findIndex((item) => item.id === id);
  if (currentIndex === -1) return null;

  const sanitizedPayload = Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  ) as Partial<Omit<PortfolioInstallment, "id" | "loanId" | "customerName" | "installmentNumber" | "totalInstallments">>;

  const updated: PortfolioInstallment = {
    ...installments[currentIndex],
    ...sanitizedPayload,
  };

  installments = installments.map((item) => (item.id === id ? updated : item));
  return updated;
}
