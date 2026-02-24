import { LoanSimulationInterestType } from "@prisma/client";
import { AppError } from "../middleware/error-handler";

type SimulationStatusLabel = "Pendente" | "Atrasado";

export type LoanSimulationCalculationInput = {
  principalAmount: number;
  interestType: LoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount?: number | null;
  installmentsCount: number;
  startDate: string;
  firstDueDate: string;
  dueDates?: string[];
};

export type LoanSimulationInstallment = {
  installmentNumber: number;
  dueDate: string;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  status: SimulationStatusLabel;
  balance?: number;
  daysInterval?: number;
};

export type LoanSimulationCalculationResult = {
  schedule: LoanSimulationInstallment[];
  totals: {
    totalAmount: number;
    totalInterest: number;
    installmentAmount: number;
  };
  normalizedInput: {
    principalAmount: number;
    interestRate: number;
    fixedFeeAmount: number;
    installmentsCount: number;
    startDate: string;
    firstDueDate: string;
    dueDates: string[];
    interestType: LoanSimulationInterestType;
  };
};

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function round2(value: number): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function sanitizeMoney(value: number): number {
  const amount = round2(value);
  return Math.abs(amount) < 0.005 ? 0 : amount;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeIsoDateOnly(value: unknown, fieldLabel: string): string {
  const raw = String(value ?? "").trim();
  if (!DATE_ONLY_REGEX.test(raw)) {
    throw new AppError(`${fieldLabel} invalida. Use YYYY-MM-DD.`, 400);
  }

  const [yearRaw, monthRaw, dayRaw] = raw.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const utcMs = Date.UTC(year, month - 1, day);
  const parsed = new Date(utcMs);

  const isValid = parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;

  if (!isValid) {
    throw new AppError(`${fieldLabel} invalida. Use uma data real no formato YYYY-MM-DD.`, 400);
  }

  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function isoToUtcMillis(isoDate: string): number {
  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  return Date.UTC(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw));
}

function diffDaysDateOnly(fromIso: string, toIso: string): number {
  const fromMs = isoToUtcMillis(fromIso);
  const toMs = isoToUtcMillis(toIso);
  return Math.round((toMs - fromMs) / MS_PER_DAY);
}

function addMonthsIsoDate(baseIsoDate: string, count: number): string {
  const [yearRaw, monthRaw, dayRaw] = baseIsoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  const totalMonths = (year * 12) + (month - 1) + Math.trunc(count);
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);

  return `${targetYear}-${pad2(targetMonth)}-${pad2(targetDay)}`;
}

function splitAmount(total: number, parts: number): number[] {
  const safeParts = Math.max(1, Math.trunc(parts));
  const cents = Math.round(round2(total) * 100);
  const base = Math.floor(cents / safeParts);
  const remainder = cents - (base * safeParts);

  return Array.from({ length: safeParts }, (_item, index) => {
    const current = base + (index === safeParts - 1 ? remainder : 0);
    return round2(current / 100);
  });
}

function resolveDueDates(input: {
  installmentsCount: number;
  startDate: string;
  firstDueDate: string;
  dueDates?: string[];
}): string[] {
  const total = Math.max(1, Math.trunc(input.installmentsCount));
  const generatedDueDates = Array.from(
    { length: total },
    (_item, index) => addMonthsIsoDate(input.firstDueDate, index),
  );

  const resolved = Array.from({ length: total }, (_item, index) => {
    const current = input.dueDates?.[index];
    if (current === undefined || current === null || String(current).trim() === "") {
      return generatedDueDates[index];
    }
    return normalizeIsoDateOnly(current, `Data da parcela #${index + 1}`);
  });

  for (let index = 0; index < resolved.length; index += 1) {
    const dueDateIso = resolved[index];
    const previousDateIso = index === 0 ? input.startDate : resolved[index - 1];
    const daysDiff = diffDaysDateOnly(previousDateIso, dueDateIso);
    if (!Number.isFinite(daysDiff) || daysDiff <= 0) {
      throw new AppError(`Data da parcela #${index + 1} deve ser maior que a data anterior.`, 400);
    }
  }

  return resolved;
}

function resolveInstallmentStatus(dueDateIso: string, todayIso: string): SimulationStatusLabel {
  const isOverdue = diffDaysDateOnly(dueDateIso, todayIso) > 0;
  return isOverdue ? "Atrasado" : "Pendente";
}

function calculateSimpleSchedule(params: {
  principalAmount: number;
  interestRate: number;
  installmentsCount: number;
  dueDates: string[];
  todayIso: string;
}) {
  const principalAmount = round2(params.principalAmount);
  const rate = params.interestRate / 100;
  const installmentsCount = Math.max(1, Math.trunc(params.installmentsCount));

  const totalInterest = round2(principalAmount * rate * installmentsCount);
  const totalAmount = round2(principalAmount + totalInterest);
  const installmentAmount = round2(totalAmount / installmentsCount);

  const principalParts = splitAmount(principalAmount, installmentsCount);
  const interestParts = splitAmount(totalInterest, installmentsCount);

  const schedule: LoanSimulationInstallment[] = Array.from({ length: installmentsCount }, (_item, index) => {
    const dueDate = params.dueDates[index];
    const amount = round2(principalParts[index] + interestParts[index]);
    return {
      installmentNumber: index + 1,
      dueDate,
      amount,
      principalAmount: principalParts[index],
      interestAmount: interestParts[index],
      status: resolveInstallmentStatus(dueDate, params.todayIso),
    };
  });

  return {
    schedule,
    totals: {
      totalAmount,
      totalInterest,
      installmentAmount,
    },
  };
}

function effectiveFactor(days: number, dailyRate: number): number {
  const safeDays = Math.max(0, Math.trunc(days));
  const safeDailyRate = Number.isFinite(dailyRate) ? dailyRate : 0;
  return Math.pow(1 + safeDailyRate, safeDays);
}

function simulateEndingBalance(
  paymentPerInstallment: number,
  principalAmount: number,
  dailyRate: number,
  startDateIso: string,
  dueDates: string[],
): number {
  if (!startDateIso || dueDates.length === 0) return Number.NaN;

  let balance = toNumber(principalAmount);
  let previousDate = startDateIso;

  for (let index = 0; index < dueDates.length; index += 1) {
    const dueDateIso = dueDates[index];
    const days = diffDaysDateOnly(previousDate, dueDateIso);

    if (!Number.isFinite(days) || days < 0) return Number.NaN;

    balance = (balance * effectiveFactor(days, dailyRate)) - toNumber(paymentPerInstallment);
    previousDate = dueDateIso;
  }

  return balance;
}

function solvePaymentBinarySearch(
  principalAmount: number,
  dailyRate: number,
  startDateIso: string,
  dueDates: string[],
  maxIterations = 60,
): number {
  if (!Number.isFinite(principalAmount) || principalAmount <= 0 || dueDates.length === 0) return 0;

  let low = 0;
  let high = Math.max(principalAmount * 10, 1);
  let balanceAtHigh = simulateEndingBalance(high, principalAmount, dailyRate, startDateIso, dueDates);

  let guard = 0;
  while (Number.isFinite(balanceAtHigh) && balanceAtHigh > 0 && guard < 60) {
    high *= 2;
    balanceAtHigh = simulateEndingBalance(high, principalAmount, dailyRate, startDateIso, dueDates);
    guard += 1;
  }

  if (!Number.isFinite(balanceAtHigh)) {
    return Number.NaN;
  }

  for (let iteration = 0; iteration < Math.max(1, Math.trunc(maxIterations)); iteration += 1) {
    const mid = (low + high) / 2;
    const balance = simulateEndingBalance(mid, principalAmount, dailyRate, startDateIso, dueDates);

    if (!Number.isFinite(balance)) {
      return Number.NaN;
    }

    if (balance > 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return round2(high);
}

function buildCompoundSchedule(
  principalAmount: number,
  dailyRate: number,
  startDateIso: string,
  dueDates: string[],
  basePayment: number,
): Array<{
  dueDate: string;
  payment: number;
  interestByPeriod: number;
  principalByPeriod: number;
  balance: number;
  days: number;
}> {
  if (!startDateIso || dueDates.length === 0) return [];

  const payment = Number.isFinite(basePayment)
    ? round2(basePayment)
    : solvePaymentBinarySearch(principalAmount, dailyRate, startDateIso, dueDates);

  let balance = round2(principalAmount);
  let previousDate = startDateIso;
  const schedule: Array<{
    dueDate: string;
    payment: number;
    interestByPeriod: number;
    principalByPeriod: number;
    balance: number;
    days: number;
  }> = [];

  for (let index = 0; index < dueDates.length; index += 1) {
    const dueDateIso = dueDates[index];
    const days = diffDaysDateOnly(previousDate, dueDateIso);
    const factor = effectiveFactor(days, dailyRate);
    const balanceBefore = balance;
    const balanceWithInterest = balanceBefore * factor;
    const periodInterest = balanceWithInterest - balanceBefore;

    let currentPayment = payment;
    let balanceAfter = balanceWithInterest - currentPayment;

    if (index === dueDates.length - 1) {
      currentPayment = round2(balanceWithInterest);
      balanceAfter = 0;
    }

    const interestRounded = sanitizeMoney(periodInterest);
    const principalRounded = sanitizeMoney(currentPayment - interestRounded);
    const balanceRounded = sanitizeMoney(balanceAfter);

    schedule.push({
      dueDate: dueDateIso,
      payment: round2(currentPayment),
      interestByPeriod: interestRounded,
      principalByPeriod: principalRounded,
      balance: balanceRounded,
      days,
    });

    balance = balanceRounded;
    previousDate = dueDateIso;
  }

  if (schedule.length > 0) {
    schedule[schedule.length - 1].balance = 0;
  }

  return schedule;
}

function calculateCompoundSchedule(params: {
  principalAmount: number;
  interestRate: number;
  startDate: string;
  dueDates: string[];
  todayIso: string;
}) {
  const dailyRate = (params.interestRate / 100) / 30;
  const payment = solvePaymentBinarySearch(
    params.principalAmount,
    dailyRate,
    params.startDate,
    params.dueDates,
  );

  if (!Number.isFinite(payment) || payment <= 0) {
    throw new AppError("Nao foi possivel calcular a simulacao com juros compostos.", 400);
  }

  const scheduleRows = buildCompoundSchedule(
    params.principalAmount,
    dailyRate,
    params.startDate,
    params.dueDates,
    payment,
  );

  if (!scheduleRows.length) {
    throw new AppError("Nao foi possivel gerar as parcelas da simulacao composta.", 400);
  }

  const schedule: LoanSimulationInstallment[] = scheduleRows.map((row, index) => ({
    installmentNumber: index + 1,
    dueDate: row.dueDate,
    amount: round2(row.payment),
    principalAmount: round2(row.principalByPeriod),
    interestAmount: round2(row.interestByPeriod),
    status: resolveInstallmentStatus(row.dueDate, params.todayIso),
    balance: round2(row.balance),
    daysInterval: row.days,
  }));

  const totalAmount = round2(schedule.reduce((sum, row) => sum + row.amount, 0));
  const totalInterest = round2(totalAmount - params.principalAmount);

  return {
    schedule,
    totals: {
      totalAmount,
      totalInterest,
      installmentAmount: round2(payment),
    },
  };
}

function calculateFixedSchedule(params: {
  principalAmount: number;
  fixedFeeAmount: number;
  installmentsCount: number;
  dueDates: string[];
  todayIso: string;
}) {
  const principalAmount = round2(params.principalAmount);
  const fixedFeeAmount = round2(params.fixedFeeAmount);
  const installmentsCount = Math.max(1, Math.trunc(params.installmentsCount));

  const totalAmount = round2(principalAmount + fixedFeeAmount);
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / installmentsCount);
  const remainderCents = totalCents - (baseCents * installmentsCount);

  const principalParts = splitAmount(principalAmount, installmentsCount);
  const fixedParts = splitAmount(fixedFeeAmount, installmentsCount);

  const schedule: LoanSimulationInstallment[] = Array.from({ length: installmentsCount }, (_item, index) => {
    const amountCents = baseCents + (index === installmentsCount - 1 ? remainderCents : 0);
    const dueDate = params.dueDates[index];

    return {
      installmentNumber: index + 1,
      dueDate,
      amount: round2(amountCents / 100),
      principalAmount: principalParts[index],
      interestAmount: fixedParts[index],
      status: resolveInstallmentStatus(dueDate, params.todayIso),
    };
  });

  return {
    schedule,
    totals: {
      totalAmount,
      totalInterest: fixedFeeAmount,
      installmentAmount: round2(totalAmount / installmentsCount),
    },
  };
}

export function calculateLoanSimulation(input: LoanSimulationCalculationInput): LoanSimulationCalculationResult {
  const principalAmount = round2(input.principalAmount);
  const installmentsCount = Math.max(1, Math.trunc(input.installmentsCount));
  const interestRate = round2(input.interestRate);
  const fixedFeeAmount = round2(input.fixedFeeAmount ?? 0);

  if (!Number.isFinite(principalAmount) || principalAmount <= 0) {
    throw new AppError("Informe um principal maior que zero para a simulacao.", 400);
  }

  if (!Number.isFinite(installmentsCount) || installmentsCount <= 0 || installmentsCount > 120) {
    throw new AppError("Quantidade de parcelas invalida para a simulacao.", 400);
  }

  const startDate = normalizeIsoDateOnly(input.startDate, "Data de inicio");
  const firstDueDate = normalizeIsoDateOnly(input.firstDueDate, "Primeiro vencimento");
  const dueDates = resolveDueDates({
    installmentsCount,
    startDate,
    firstDueDate,
    dueDates: input.dueDates,
  });

  const todayIso = new Date().toISOString().slice(0, 10);

  let calculation: {
    schedule: LoanSimulationInstallment[];
    totals: {
      totalAmount: number;
      totalInterest: number;
      installmentAmount: number;
    };
  };

  if (input.interestType === LoanSimulationInterestType.FIXO) {
    if (fixedFeeAmount < 0) {
      throw new AppError("Acrescimo fixo invalido para simulacao.", 400);
    }

    calculation = calculateFixedSchedule({
      principalAmount,
      fixedFeeAmount,
      installmentsCount,
      dueDates,
      todayIso,
    });
  } else if (input.interestType === LoanSimulationInterestType.SIMPLES) {
    if (!Number.isFinite(interestRate) || interestRate <= 0) {
      throw new AppError("Taxa de juros invalida para simulacao simples.", 400);
    }

    calculation = calculateSimpleSchedule({
      principalAmount,
      interestRate,
      installmentsCount,
      dueDates,
      todayIso,
    });
  } else {
    if (!Number.isFinite(interestRate) || interestRate <= 0) {
      throw new AppError("Taxa de juros invalida para simulacao composta.", 400);
    }

    calculation = calculateCompoundSchedule({
      principalAmount,
      interestRate,
      startDate,
      dueDates,
      todayIso,
    });
  }

  return {
    schedule: calculation.schedule,
    totals: {
      totalAmount: round2(calculation.totals.totalAmount),
      totalInterest: round2(calculation.totals.totalInterest),
      installmentAmount: round2(calculation.totals.installmentAmount),
    },
    normalizedInput: {
      principalAmount,
      interestRate,
      fixedFeeAmount,
      installmentsCount,
      startDate,
      firstDueDate,
      dueDates,
      interestType: input.interestType,
    },
  };
}
