import bcrypt from "bcryptjs";
import {
  ClientStatus,
  InstallmentStatus,
  InterestType,
  LoanStatus,
  PaymentMethod,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

type Scenario =
  | "quitado"
  | "healthy"
  | "mixed"
  | "overdue_light"
  | "overdue_heavy"
  | "future"
  | "pressure_7"
  | "pressure_30"
  | "delayed"
  | "concentration_top1"
  | "concentration_top3";

type StressOptions = {
  userEmail: string;
  userName: string;
  userPassword: string;
  tag: string;
  timeZone: string;
  seed: number;
  clientsCount: number;
  resetLoans: boolean;
};

type InstallmentBlueprint = {
  number: number;
  dueDate: Date;
  status: InstallmentStatus;
  paymentDate: Date | null;
  amount: number;
  principalAmount: number;
  interestAmount: number;
  paymentMethod: PaymentMethod | null;
  notes: string;
};

type LoanBlueprint = {
  principalAmount: number;
  totalAmount: number;
  interestRate: number;
  interestType: InterestType;
  installmentsCount: number;
  installmentAmount: number;
  paymentMethod: PaymentMethod;
  startDate: Date;
  firstDueDate: Date;
  dueDate: Date;
  status: LoanStatus;
  observations: string;
  installments: InstallmentBlueprint[];
  scenario: Scenario;
};

function parsePositiveInt(input: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  const safe = Math.trunc(parsed);
  if (safe < min) return min;
  if (safe > max) return max;
  return safe;
}

function parseBoolean(input: string | undefined, fallback: boolean): boolean {
  if (!input) return fallback;
  const normalized = input.trim().toLowerCase();
  if (["1", "true", "yes", "y", "sim", "s"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "nao", "não"].includes(normalized)) return false;
  return fallback;
}

function getIsoTodayInTimeZone(timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());
  const year = parts.find((item) => item.type === "year")?.value ?? "1970";
  const month = parts.find((item) => item.type === "month")?.value ?? "01";
  const day = parts.find((item) => item.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function isoToUtcDateOnly(isoDate: string): Date {
  const match = isoDate.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addDaysUtc(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function computeCpfCheckDigit(digits: number[], factorStart: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (factorStart - index), 0);
  const mod = sum % 11;
  const check = 11 - mod;
  return check >= 10 ? 0 : check;
}

function generateCpf(seed: number): string {
  const base9 = String(100_000_000 + (seed % 900_000_000)).padStart(9, "0").slice(-9);
  const baseDigits = base9.split("").map((c) => Number(c));
  const d1 = computeCpfCheckDigit(baseDigits, 10);
  const d2 = computeCpfCheckDigit([...baseDigits, d1], 11);
  return `${base9}${d1}${d2}`;
}

function generatePhone(seed: number, ddd: string): string {
  const suffix = String(900_000_000 + (seed % 99_999_999)).padStart(9, "0").slice(-9);
  return `${ddd}${suffix}`;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let state = Math.imul(t ^ (t >>> 15), 1 | t);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick<T>(rand: () => number, values: readonly T[]): T {
  const index = randomInt(rand, 0, values.length - 1);
  return values[index];
}

function parseOptions(): StressOptions {
  const adminEmail = (process.env.ADMIN_EMAIL || "admin@credix.app.br").toLowerCase().trim();
  const userEmail = (process.env.STRESS_USER_EMAIL || adminEmail).toLowerCase().trim();
  const userName = process.env.STRESS_USER_NAME || process.env.ADMIN_NAME || "Administrador";
  const userPassword = process.env.STRESS_USER_PASSWORD || process.env.ADMIN_PASSWORD || "123456";
  const tag = (process.env.STRESS_TAG || "stress-relatorios-v1").trim();
  const timeZone = process.env.SEED_TZ || process.env.STRESS_TZ || "America/Sao_Paulo";

  return {
    userEmail,
    userName,
    userPassword,
    tag,
    timeZone,
    seed: parsePositiveInt(process.env.STRESS_SEED, 20260221, 1, 9_999_999),
    clientsCount: parsePositiveInt(process.env.STRESS_CLIENTS, 240, 200, 2_000),
    resetLoans: parseBoolean(process.env.STRESS_RESET_LOANS, true),
  };
}

async function syncTableSequence(tableName: "User" | "Client" | "Loan" | "Installment" | "Payment") {
  const sql = `
    SELECT setval(
      pg_get_serial_sequence('"${tableName}"', 'id'),
      COALESCE((SELECT MAX(id) FROM "${tableName}"), 1),
      true
    );
  `;
  await prisma.$executeRawUnsafe(sql);
}

async function syncAllSequences() {
  await syncTableSequence("User");
  await syncTableSequence("Client");
  await syncTableSequence("Loan");
  await syncTableSequence("Installment");
  await syncTableSequence("Payment");
}

async function ensureTargetUser(options: StressOptions) {
  const existing = await prisma.user.findUnique({
    where: { email: options.userEmail },
  });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(options.userPassword, 10);
  return prisma.user.create({
    data: {
      name: options.userName,
      email: options.userEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
}

function pickScenario(
  clientIndex: number,
  localLoanIndex: number,
  globalLoanIndex: number,
  rand: () => number,
): Scenario {
  if (clientIndex === 0 && localLoanIndex === 0) return "concentration_top1";
  if ((clientIndex === 1 || clientIndex === 2) && localLoanIndex === 0) return "concentration_top3";

  const weighted: Scenario[] = [
    "mixed",
    "mixed",
    "healthy",
    "healthy",
    "overdue_light",
    "overdue_heavy",
    "future",
    "pressure_7",
    "pressure_30",
    "delayed",
    "quitado",
  ];

  const deterministicBias = (clientIndex + localLoanIndex + globalLoanIndex) % weighted.length;
  if (rand() < 0.42) return weighted[deterministicBias];
  return pick(rand, weighted);
}

function computeLoanStatus(installments: InstallmentBlueprint[]): LoanStatus {
  if (installments.length === 0) return LoanStatus.PENDENTE;
  const allPaid = installments.every((item) => item.status === InstallmentStatus.PAGO);
  if (allPaid) return LoanStatus.QUITADO;
  if (installments.some((item) => item.status === InstallmentStatus.ATRASADO)) return LoanStatus.ATRASADO;
  return LoanStatus.EM_DIA;
}

function buildLoanBlueprint(
  clientIndex: number,
  localLoanIndex: number,
  globalLoanIndex: number,
  today: Date,
  rand: () => number,
  tag: string,
): LoanBlueprint {
  const scenario = pickScenario(clientIndex, localLoanIndex, globalLoanIndex, rand);
  const paymentMethods = [PaymentMethod.PIX, PaymentMethod.DINHEIRO, PaymentMethod.TRANSFERENCIA, PaymentMethod.CARTAO] as const;
  const interestTypes = [InterestType.SIMPLES, InterestType.COMPOSTO] as const;

  let installmentsCount = pick(rand, [3, 4, 6, 8, 10, 12] as const);
  let principalMin = 900;
  let principalMax = 18_000;

  if (scenario === "concentration_top1") {
    installmentsCount = 12;
    principalMin = 220_000;
    principalMax = 290_000;
  } else if (scenario === "concentration_top3") {
    installmentsCount = 10;
    principalMin = 95_000;
    principalMax = 150_000;
  } else if (scenario === "overdue_heavy") {
    principalMin = 4_000;
    principalMax = 28_000;
  } else if (scenario === "future") {
    principalMin = 1_200;
    principalMax = 14_000;
  } else if (scenario === "pressure_7" || scenario === "pressure_30") {
    principalMin = 2_500;
    principalMax = 20_000;
  } else if (scenario === "quitado") {
    principalMin = 1_000;
    principalMax = 12_000;
  }

  const principalAmount = round2(randomInt(rand, principalMin, principalMax));
  const interestRate = round2(randomInt(rand, 8, 55) + rand());
  const interestType = pick(rand, interestTypes);
  const paymentMethod = pick(rand, paymentMethods);
  const totalAmount = round2(principalAmount * (1 + interestRate / 100));
  const installmentAmount = round2(totalAmount / installmentsCount);
  const installmentPrincipal = round2(principalAmount / installmentsCount);
  const installmentInterest = round2(Math.max(0, installmentAmount - installmentPrincipal));

  let startOffset = -120;
  let stepDays = 30;

  switch (scenario) {
    case "quitado":
      startOffset = -(installmentsCount * 30) - randomInt(rand, 60, 210);
      break;
    case "healthy":
      startOffset = -(installmentsCount - 2) * 30 - randomInt(rand, 10, 45);
      break;
    case "mixed":
      startOffset = -(installmentsCount - 1) * 30 - randomInt(rand, 5, 40);
      break;
    case "overdue_light":
      startOffset = -(installmentsCount - 1) * 30 - randomInt(rand, 20, 70);
      break;
    case "overdue_heavy":
      startOffset = -(installmentsCount * 30) - randomInt(rand, 90, 240);
      break;
    case "future":
      startOffset = randomInt(rand, 2, 20);
      break;
    case "pressure_7":
      startOffset = -14;
      stepDays = 7;
      break;
    case "pressure_30":
      startOffset = -6;
      stepDays = 10;
      break;
    case "delayed":
      startOffset = -(installmentsCount - 1) * 30 - randomInt(rand, 25, 90);
      break;
    case "concentration_top1":
      startOffset = -180;
      stepDays = 30;
      break;
    case "concentration_top3":
      startOffset = -120;
      stepDays = 30;
      break;
    default:
      break;
  }

  const installments: InstallmentBlueprint[] = [];

  for (let i = 0; i < installmentsCount; i += 1) {
    const dueOffset = startOffset + i * stepDays;
    const dueDate = addDaysUtc(today, dueOffset);
    let status: InstallmentStatus = InstallmentStatus.PENDENTE;
    let paymentDate: Date | null = null;
    let method: PaymentMethod | null = null;

    if (scenario === "quitado") {
      status = InstallmentStatus.PAGO;
      paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 4));
      method = paymentMethod;
    } else if (scenario === "future") {
      status = InstallmentStatus.PENDENTE;
    } else if (scenario === "healthy") {
      if (i < installmentsCount - 1) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 3));
        method = paymentMethod;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "mixed") {
      const paidLimit = Math.max(1, Math.floor(installmentsCount * 0.5));
      const overdueLimit = Math.max(paidLimit + 1, Math.floor(installmentsCount * 0.75));
      if (i < paidLimit) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 6));
        method = paymentMethod;
      } else if (i < overdueLimit && dueOffset < -2) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "overdue_light") {
      const paidLimit = Math.max(1, Math.floor(installmentsCount * 0.35));
      if (i < paidLimit) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 5));
        method = paymentMethod;
      } else if (dueOffset < -5) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "overdue_heavy") {
      const paidLimit = Math.max(1, Math.floor(installmentsCount * 0.2));
      if (i < paidLimit) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 1, 9));
        method = paymentMethod;
      } else {
        status = InstallmentStatus.ATRASADO;
      }
    } else if (scenario === "pressure_7") {
      if (dueOffset < -10) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 4));
        method = paymentMethod;
      } else if (dueOffset < 0 && rand() < 0.35) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "pressure_30") {
      if (dueOffset < -20 && rand() < 0.65) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 5));
        method = paymentMethod;
      } else if (dueOffset < -1 && rand() < 0.15) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "delayed") {
      if (dueOffset < -40) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 3, 14));
        method = paymentMethod;
      } else if (dueOffset < -2) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "concentration_top1") {
      if (i < 2) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 4));
        method = paymentMethod;
      } else if (i < 8) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    } else if (scenario === "concentration_top3") {
      if (i < 2) {
        status = InstallmentStatus.PAGO;
        paymentDate = addDaysUtc(dueDate, randomInt(rand, 0, 5));
        method = paymentMethod;
      } else if (i < 6) {
        status = InstallmentStatus.ATRASADO;
      } else {
        status = InstallmentStatus.PENDENTE;
      }
    }

    installments.push({
      number: i + 1,
      dueDate,
      status,
      paymentDate,
      amount: installmentAmount,
      principalAmount: installmentPrincipal,
      interestAmount: installmentInterest,
      paymentMethod: method,
      notes: `[STRESS:${tag}] ${scenario}`,
    });
  }

  const firstDueDate = installments[0]?.dueDate ?? addDaysUtc(today, 30);
  const dueDate = installments[installments.length - 1]?.dueDate ?? firstDueDate;
  const startDate = addDaysUtc(firstDueDate, -30);
  const status = computeLoanStatus(installments);

  return {
    principalAmount,
    totalAmount,
    interestRate,
    interestType,
    installmentsCount,
    installmentAmount,
    paymentMethod,
    startDate,
    firstDueDate,
    dueDate,
    status,
    observations: `[STRESS:${tag}] ${scenario} | c${clientIndex + 1}l${localLoanIndex + 1}`,
    installments,
    scenario,
  };
}

async function main() {
  const options = parseOptions();
  const rand = mulberry32(options.seed);
  const today = isoToUtcDateOnly(getIsoTodayInTimeZone(options.timeZone));

  await syncAllSequences();
  const user = await ensureTargetUser(options);
  const dddPool = ["11", "21", "31", "41", "51", "61", "71", "81", "91", "27", "48", "62", "65", "67", "85"];

  const stressClients = [];
  for (let index = 0; index < options.clientsCount; index += 1) {
    const clientNumber = index + 1;
    const cpfSeed = options.seed * 10_000 + clientNumber;
    const cpf = generateCpf(cpfSeed);
    const ddd = dddPool[index % dddPool.length];
    const createdAt = addDaysUtc(today, -randomInt(rand, 30, 720));
    const status = index % 19 === 0 ? ClientStatus.INATIVO : ClientStatus.ATIVO;

    const client = await prisma.client.upsert({
      where: {
        ownerUserId_cpf: {
          ownerUserId: user.id,
          cpf,
        },
      },
      update: {
        name: `Stress Cliente ${String(clientNumber).padStart(3, "0")}`,
        phone: generatePhone(cpfSeed, ddd),
        email: `stress.cliente.${String(clientNumber).padStart(3, "0")}@demo.local`,
        status,
        address: `Rua Stress ${clientNumber}, Centro`,
        notes: `[STRESS:${options.tag}] Dataset de carga para relatorios`,
      },
      create: {
        ownerUserId: user.id,
        name: `Stress Cliente ${String(clientNumber).padStart(3, "0")}`,
        cpf,
        phone: generatePhone(cpfSeed, ddd),
        email: `stress.cliente.${String(clientNumber).padStart(3, "0")}@demo.local`,
        status,
        address: `Rua Stress ${clientNumber}, Centro`,
        notes: `[STRESS:${options.tag}] Dataset de carga para relatorios`,
        createdAt,
      },
    });

    stressClients.push(client);
  }

  if (options.resetLoans) {
    await prisma.loan.deleteMany({
      where: {
        ownerUserId: user.id,
        clientId: { in: stressClients.map((client) => client.id) },
      },
    });
  }

  let createdLoans = 0;
  let createdInstallments = 0;
  let createdPayments = 0;
  let globalLoanIndex = 0;

  for (let clientIndex = 0; clientIndex < stressClients.length; clientIndex += 1) {
    const client = stressClients[clientIndex];
    let loansForClient = 1;
    if (rand() < 0.76) loansForClient += 1;
    if (rand() < 0.34) loansForClient += 1;
    if (clientIndex < 12) loansForClient += 1;
    if (clientIndex < 3) loansForClient += 1;

    for (let localLoanIndex = 0; localLoanIndex < loansForClient; localLoanIndex += 1) {
      const plan = buildLoanBlueprint(clientIndex, localLoanIndex, globalLoanIndex, today, rand, options.tag);
      globalLoanIndex += 1;

      const loan = await prisma.loan.create({
        data: {
          ownerUserId: user.id,
          clientId: client.id,
          principalAmount: plan.principalAmount,
          interestRate: plan.interestRate,
          interestType: plan.interestType,
          installmentsCount: plan.installmentsCount,
          installmentAmount: plan.installmentAmount,
          totalAmount: plan.totalAmount,
          paymentMethod: plan.paymentMethod,
          startDate: plan.startDate,
          firstDueDate: plan.firstDueDate,
          dueDate: plan.dueDate,
          status: plan.status,
          observations: plan.observations,
        },
      });
      createdLoans += 1;

      for (const installment of plan.installments) {
        const createdInstallment = await prisma.installment.create({
          data: {
            ownerUserId: user.id,
            loanId: loan.id,
            clientId: client.id,
            installmentNumber: installment.number,
            dueDate: installment.dueDate,
            paymentDate: installment.paymentDate,
            amount: installment.amount,
            principalAmount: installment.principalAmount,
            interestAmount: installment.interestAmount,
            status: installment.status,
            paymentMethod: installment.paymentMethod,
            notes: installment.notes,
          },
        });
        createdInstallments += 1;

        if (installment.status === InstallmentStatus.PAGO && installment.paymentDate) {
          await prisma.payment.create({
            data: {
              ownerUserId: user.id,
              loanId: loan.id,
              installmentId: createdInstallment.id,
              amount: installment.amount,
              paymentDate: installment.paymentDate,
              method: installment.paymentMethod ?? plan.paymentMethod,
              notes: `[STRESS:${options.tag}] pagamento`,
            },
          });
          createdPayments += 1;
        }
      }
    }
  }

  const [totalClients, totalLoans, totalInstallments, totalPayments, overdueInstallments, pendingInstallments, paidInstallments] = await Promise.all([
    prisma.client.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` } } }),
    prisma.loan.count({ where: { ownerUserId: user.id, observations: { contains: `[STRESS:${options.tag}]` } } }),
    prisma.installment.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` } } }),
    prisma.payment.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` } } }),
    prisma.installment.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` }, status: InstallmentStatus.ATRASADO } }),
    prisma.installment.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` }, status: InstallmentStatus.PENDENTE } }),
    prisma.installment.count({ where: { ownerUserId: user.id, notes: { contains: `[STRESS:${options.tag}]` }, status: InstallmentStatus.PAGO } }),
  ]);

  console.log("Seed stress concluido.");
  console.log(`Usuario alvo: ${user.email} (id=${user.id})`);
  console.log(`Tag: ${options.tag}`);
  console.log(`Clientes stress: ${totalClients}`);
  console.log(`Emprestimos stress: ${totalLoans} (novos nesta execucao: ${createdLoans})`);
  console.log(`Parcelas stress: ${totalInstallments} (novas nesta execucao: ${createdInstallments})`);
  console.log(`Pagamentos stress: ${totalPayments} (novos nesta execucao: ${createdPayments})`);
  console.log(`Status parcelas -> Pago: ${paidInstallments}, Pendente: ${pendingInstallments}, Atrasado: ${overdueInstallments}`);
}

main()
  .catch((error) => {
    console.error("Erro no seed stress:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
