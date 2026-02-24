import bcrypt from "bcryptjs";
import {
  ClientStatus,
  InstallmentStatus,
  InterestType,
  LoanSimulationInterestType,
  LoanSimulationStatus,
  LoanStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
  UserRole,
} from "@prisma/client";

const prisma = new PrismaClient();

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

function toIsoDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function splitAmount(total: number, parts: number): number[] {
  const safeParts = Math.max(1, Math.trunc(parts));
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / safeParts);
  const remainder = cents - (base * safeParts);

  return Array.from({ length: safeParts }, (_item, index) => {
    const amount = base + (index === safeParts - 1 ? remainder : 0);
    return Math.round(amount) / 100;
  });
}

function buildSimulationSeedPayload(params: {
  principalAmount: number;
  interestType: LoanSimulationInterestType;
  interestRate: number;
  fixedFeeAmount: number;
  installmentsCount: number;
  startDateIso: string;
  firstDueDateIso: string;
  todayIso: string;
  observations: string;
}) {
  const installmentsCount = Math.max(1, Math.trunc(params.installmentsCount));
  const principalAmount = Math.round(params.principalAmount * 100) / 100;
  const fixedFeeAmount = Math.round(params.fixedFeeAmount * 100) / 100;
  const interestRate = Math.round(params.interestRate * 100) / 100;

  const dueDates = Array.from({ length: installmentsCount }, (_item, index) => {
    const firstDueDate = isoToUtcDateOnly(params.firstDueDateIso);
    return toIsoDateOnly(addDaysUtc(firstDueDate, index * 30));
  });

  const totalInterest = params.interestType === LoanSimulationInterestType.FIXO
    ? fixedFeeAmount
    : Math.round((principalAmount * (interestRate / 100) * installmentsCount) * 100) / 100;
  const totalAmount = Math.round((principalAmount + totalInterest) * 100) / 100;
  const installmentAmount = Math.round((totalAmount / installmentsCount) * 100) / 100;

  const principalParts = splitAmount(principalAmount, installmentsCount);
  const interestParts = splitAmount(totalInterest, installmentsCount);
  const amountParts = splitAmount(totalAmount, installmentsCount);

  return {
    firstDueDate: isoToUtcDateOnly(params.firstDueDateIso),
    scheduleJson: {
      startDate: params.startDateIso,
      dueDates,
      observations: params.observations,
      installments: dueDates.map((dueDate, index) => ({
        installmentNumber: index + 1,
        dueDate,
        amount: amountParts[index],
        principalAmount: principalParts[index],
        interestAmount: interestParts[index],
        status: dueDate < params.todayIso ? "Atrasado" : "Pendente",
      })),
    },
    totalsJson: {
      totalAmount,
      totalInterest,
      installmentAmount,
      interestRate,
      fixedFeeAmount,
    },
  };
}

function computeCpfCheckDigit(digits: number[], factorStart: number): number {
  const sum = digits.reduce((acc, digit, index) => acc + digit * (factorStart - index), 0);
  const mod = sum % 11;
  const check = 11 - mod;
  return check >= 10 ? 0 : check;
}

function generateCpf(seed: number): string {
  const base9 = String(900_000_000 + seed).padStart(9, "0").slice(0, 9);
  const baseDigits = base9.split("").map((c) => Number(c));
  const d1 = computeCpfCheckDigit(baseDigits, 10);
  const d2 = computeCpfCheckDigit([...baseDigits, d1], 11);
  return `${base9}${d1}${d2}`;
}

function generatePhone(seed: number, dd = "11"): string {
  const suffix = String(900_000_000 + seed).padStart(9, "0").slice(0, 9);
  return `${dd}${suffix}`;
}

type DemoClientProfile = {
  name: string;
  dd: string;
  address: string | null;
};

const DEMO_CLIENT_PROFILES: DemoClientProfile[] = [
  { name: "Joao Pedro Almeida", dd: "11", address: "Rua Domingos de Morais, 1184 - Vila Mariana - Sao Paulo/SP" },
  { name: "Mariana Costa Ribeiro", dd: "21", address: "Rua Barata Ribeiro, 572 - Copacabana - Rio de Janeiro/RJ" },
  { name: "Carlos Henrique Souza", dd: "31", address: "Avenida Afonso Pena, 2400 - Centro - Belo Horizonte/MG" },
  { name: "Fernanda Lima Martins", dd: "41", address: "Rua Visconde de Guarapuava, 950 - Centro - Curitiba/PR" },
  { name: "Rafael Gomes Silva", dd: "51", address: "Rua Mostardeiro, 430 - Moinhos de Vento - Porto Alegre/RS" },
  { name: "Aline Rocha Nascimento", dd: "71", address: "Rua Chile, 98 - Centro Historico - Salvador/BA" },
  { name: "Bruno Oliveira Pires", dd: "85", address: "Avenida Beira Mar, 1240 - Meireles - Fortaleza/CE" },
  { name: "Patricia Ferreira Campos", dd: "61", address: "SQS 307 Bloco C - Asa Sul - Brasilia/DF" },
  { name: "Gabriel Santos Araujo", dd: "62", address: "Avenida T-63, 820 - Setor Bueno - Goiania/GO" },
  { name: "Larissa Mendes Duarte", dd: "48", address: "Rua Bocaiuva, 315 - Centro - Florianopolis/SC" },
  { name: "Thiago Barros Teixeira", dd: "27", address: "Avenida Dante Michelini, 540 - Jardim da Penha - Vitoria/ES" },
  { name: "Juliana Prado Farias", dd: "81", address: "Rua da Aurora, 1200 - Boa Vista - Recife/PE" },
  { name: "Mateus Carvalho Nunes", dd: "91", address: "Avenida Presidente Vargas, 412 - Campina - Belem/PA" },
  { name: "Camila Andrade Mota", dd: "98", address: "Avenida Litoranea, 210 - Ponta Dareia - Sao Luis/MA" },
  { name: "Ricardo Tavares Lopes", dd: "92", address: "Avenida Djalma Batista, 830 - Chapada - Manaus/AM" },
  { name: "Vanessa Monteiro Dias", dd: "65", address: "Avenida Isaac Povoas, 560 - Centro Norte - Cuiaba/MT" },
  { name: "Eduardo Cavalcanti Melo", dd: "67", address: "Rua 14 de Julho, 1400 - Centro - Campo Grande/MS" },
  { name: "Debora Siqueira Freitas", dd: "86", address: "Avenida Frei Serafim, 890 - Centro - Teresina/PI" },
];

function toEmailLocalPart(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

type InstallmentPlan = {
  dueOffsetDays: number;
  paid?: boolean;
  paymentDelayDays?: number;
  status?: InstallmentStatus;
};

type LoanPlan = {
  label: string;
  principalAmount: number;
  totalAmount: number;
  installmentsCount: number;
  installmentAmount: number;
  interestRate: number;
  interestType: InterestType;
  paymentMethod: PaymentMethod;
  installments: InstallmentPlan[];
};

function computeLoanStatus(today: Date, installments: InstallmentPlan[]): LoanStatus {
  const allPaid = installments.every((i) => Boolean(i.paid) || i.status === InstallmentStatus.PAGO);
  if (allPaid) return LoanStatus.QUITADO;

  const hasOverdue = installments.some((i) => {
    const dueDate = addDaysUtc(today, i.dueOffsetDays);
    const status = i.status;
    if (status === InstallmentStatus.ATRASADO) return true;
    if (status === InstallmentStatus.PAGO || i.paid) return false;
    return dueDate < today;
  });

  return hasOverdue ? LoanStatus.ATRASADO : LoanStatus.EM_DIA;
}

async function seedAdminUser() {
  const name = process.env.ADMIN_NAME || "Administrador";
  const email = (process.env.ADMIN_EMAIL || "admin@credfacil.com").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "123456";

  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      passwordHash,
      role: UserRole.ADMIN,
    },
    create: {
      name,
      email,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

}

async function main() {
  const adminUser = await seedAdminUser();
  const timeZone = process.env.SEED_TZ || "America/Sao_Paulo";
  const todayIso = getIsoTodayInTimeZone(timeZone);
  const today = isoToUtcDateOnly(todayIso);

  const demoCount = 18;
  const demoCpfs = Array.from({ length: demoCount }, (_, index) => generateCpf(index + 1));

  await prisma.$transaction(async (tx) => {
    // Remove o dataset demo anterior (somente os CPFs gerados aqui).
    await tx.client.deleteMany({
      where: {
        ownerUserId: adminUser.id,
        cpf: { in: demoCpfs },
      },
    });

    let nextClientId = ((await tx.client.aggregate({ _max: { id: true } }))._max.id ?? 0) + 1;

    const clients = [];
    for (let index = 0; index < demoCount; index += 1) {
      const id = index + 1;
      const cpf = demoCpfs[index];
      const profile = DEMO_CLIENT_PROFILES[index];
      const name = profile?.name || `Cliente ${String(id).padStart(2, "0")}`;
      const emailLocalPart = toEmailLocalPart(name);

      const created = await tx.client.create({
        data: {
          id: nextClientId++,
          ownerUserId: adminUser.id,
          name,
          cpf,
          phone: generatePhone(id, profile?.dd || "11"),
          email: id === 5 ? null : `${emailLocalPart}.${id}@maildemo.local`,
          status: id % 9 === 0 ? ClientStatus.INATIVO : ClientStatus.ATIVO,
          address: profile?.address ?? null,
          notes: "Base de validacao de telas",
          createdAt: addDaysUtc(today, -240 + id * 7),
        },
      });
      clients.push(created);
    }

    const byIndex = (n: number) => clients[n - 1];

    const plans: Array<{ clientId: number; loans: LoanPlan[] }> = [
      {
        clientId: byIndex(1).id,
        loans: [
          {
            label: "Credito pessoal (misto com atraso)",
            principalAmount: 8000,
            totalAmount: 10400,
            installmentsCount: 8,
            installmentAmount: 1300,
            interestRate: 30,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.PIX,
            installments: [
              { dueOffsetDays: -180, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -150, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: -120, paid: true, paymentDelayDays: 2 },
              { dueOffsetDays: -90, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -60, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -30, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: 5 },
              { dueOffsetDays: 35 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(2).id,
        loans: [
          {
            label: "Credito pessoal (carteira em dia)",
            principalAmount: 3000,
            totalAmount: 3600,
            installmentsCount: 6,
            installmentAmount: 600,
            interestRate: 20,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.DINHEIRO,
            installments: [
              { dueOffsetDays: -150, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -120, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: -90, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -60, paid: true, paymentDelayDays: 2 },
              { dueOffsetDays: -30, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: 7 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(3).id,
        loans: [
          {
            label: "Credito pessoal (quitado)",
            principalAmount: 5000,
            totalAmount: 6000,
            installmentsCount: 6,
            installmentAmount: 1000,
            interestRate: 20,
            interestType: InterestType.COMPOSTO,
            paymentMethod: PaymentMethod.TRANSFERENCIA,
            installments: [
              { dueOffsetDays: -210, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -180, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: -150, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -120, paid: true, paymentDelayDays: 2 },
              { dueOffsetDays: -90, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -60, paid: true, paymentDelayDays: 3 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(4).id,
        loans: [
          {
            label: "Credito pessoal (vence hoje e proximas semanas)",
            principalAmount: 2000,
            totalAmount: 2400,
            installmentsCount: 4,
            installmentAmount: 600,
            interestRate: 20,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.PIX,
            installments: [
              { dueOffsetDays: -30, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: 0 },
              { dueOffsetDays: 3 },
              { dueOffsetDays: 30 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(5).id,
        loans: [
          {
            label: "Credito pessoal (somente em aberto)",
            principalAmount: 1500,
            totalAmount: 1800,
            installmentsCount: 3,
            installmentAmount: 600,
            interestRate: 20,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.CARTAO,
            installments: [
              { dueOffsetDays: 2 },
              { dueOffsetDays: 32 },
              { dueOffsetDays: 62 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(8).id,
        loans: [
          {
            label: "Capital de giro (atraso alto)",
            principalAmount: 10000,
            totalAmount: 14000,
            installmentsCount: 10,
            installmentAmount: 1400,
            interestRate: 40,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.PIX,
            installments: [
              { dueOffsetDays: -120, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -90, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: -60, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -30, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -15, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -5, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: 5 },
              { dueOffsetDays: 35 },
              { dueOffsetDays: 65 },
              { dueOffsetDays: 95 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(9).id,
        loans: [
          {
            label: "Capital de giro (atraso medio)",
            principalAmount: 3600,
            totalAmount: 4500,
            installmentsCount: 9,
            installmentAmount: 500,
            interestRate: 25,
            interestType: InterestType.COMPOSTO,
            paymentMethod: PaymentMethod.TRANSFERENCIA,
            installments: [
              { dueOffsetDays: -240, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -210, paid: true, paymentDelayDays: 1 },
              { dueOffsetDays: -180, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: -150, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -120, status: InstallmentStatus.ATRASADO },
              { dueOffsetDays: -90 },
              { dueOffsetDays: -60 },
              { dueOffsetDays: -30 },
              { dueOffsetDays: 10 },
            ],
          },
        ],
      },
      {
        clientId: byIndex(12).id,
        loans: [
          {
            label: "Credito pessoal (ticket pequeno)",
            principalAmount: 1200,
            totalAmount: 1500,
            installmentsCount: 3,
            installmentAmount: 500,
            interestRate: 25,
            interestType: InterestType.SIMPLES,
            paymentMethod: PaymentMethod.DINHEIRO,
            installments: [
              { dueOffsetDays: -20, paid: true, paymentDelayDays: 0 },
              { dueOffsetDays: 6 },
              { dueOffsetDays: 36 },
            ],
          },
        ],
      },
    ];

    // Alguns ambientes podem ter sequencias desalinhadas por inserts com ID manual.
    // Aqui usamos IDs explicitos (max+1) para evitar colisao.
    let nextLoanId = ((await tx.loan.aggregate({ _max: { id: true } }))._max.id ?? 0) + 1;
    let nextInstallmentId = ((await tx.installment.aggregate({ _max: { id: true } }))._max.id ?? 0) + 1;
    let nextPaymentId = ((await tx.payment.aggregate({ _max: { id: true } }))._max.id ?? 0) + 1;

    for (const item of plans) {
      const client = clients.find((c) => c.id === item.clientId);
      if (!client) continue;

      for (const plan of item.loans) {
        const loanStatus = computeLoanStatus(today, plan.installments);
        const dueDates = plan.installments.map((inst) => addDaysUtc(today, inst.dueOffsetDays));
        const firstDueDate = dueDates.reduce((min, current) => (current < min ? current : min), dueDates[0]);
        const lastDueDate = dueDates.reduce((max, current) => (current > max ? current : max), dueDates[0]);
        const startDate = addDaysUtc(firstDueDate, -20);

        const loan = await tx.loan.create({
          data: {
            id: nextLoanId++,
            ownerUserId: adminUser.id,
            clientId: client.id,
            principalAmount: plan.principalAmount,
            interestRate: plan.interestRate,
            interestType: plan.interestType,
            installmentsCount: plan.installmentsCount,
            installmentAmount: plan.installmentAmount,
            totalAmount: plan.totalAmount,
            paymentMethod: plan.paymentMethod,
            startDate,
            firstDueDate,
            dueDate: lastDueDate,
            status: loanStatus,
            observations: plan.label,
          },
        });

        for (let index = 0; index < plan.installments.length; index += 1) {
          const instPlan = plan.installments[index];
          const dueDate = addDaysUtc(today, instPlan.dueOffsetDays);
          const paid = Boolean(instPlan.paid) || instPlan.status === InstallmentStatus.PAGO;
          const status = paid
            ? InstallmentStatus.PAGO
            : instPlan.status ?? InstallmentStatus.PENDENTE;

          const paymentDate = paid ? addDaysUtc(dueDate, instPlan.paymentDelayDays ?? 0) : null;

          const installment = await tx.installment.create({
            data: {
              id: nextInstallmentId++,
              ownerUserId: adminUser.id,
              loanId: loan.id,
              clientId: client.id,
              installmentNumber: index + 1,
              dueDate,
              paymentDate,
              amount: plan.installmentAmount,
              status,
              paymentMethod: paid ? plan.paymentMethod : null,
              notes: "Seed demo",
            },
          });

          if (paid && paymentDate) {
            await tx.payment.create({
              data: {
                id: nextPaymentId++,
                ownerUserId: adminUser.id,
                loanId: loan.id,
                installmentId: installment.id,
                amount: plan.installmentAmount,
                paymentDate,
                method: plan.paymentMethod,
                notes: "Seed demo",
              },
            });
          }
        }
      }
    }

    await tx.loanSimulation.deleteMany({
      where: {
        ownerUserId: adminUser.id,
        clientId: { in: clients.map((item) => item.id) },
      },
    });

    const simulationSeeds = [
      {
        clientId: byIndex(1).id,
        principalAmount: 3200,
        interestType: LoanSimulationInterestType.SIMPLES,
        interestRate: 9.5,
        fixedFeeAmount: 0,
        installmentsCount: 6,
        startDateIso: todayIso,
        firstDueDateIso: toIsoDateOnly(addDaysUtc(today, 20)),
        status: LoanSimulationStatus.DRAFT,
        expiresAt: addDaysUtc(today, 7),
        observations: "[SEED_DEMO] Simulacao pendente para envio",
      },
      {
        clientId: byIndex(2).id,
        principalAmount: 6800,
        interestType: LoanSimulationInterestType.COMPOSTO,
        interestRate: 12.3,
        fixedFeeAmount: 0,
        installmentsCount: 8,
        startDateIso: todayIso,
        firstDueDateIso: toIsoDateOnly(addDaysUtc(today, 15)),
        status: LoanSimulationStatus.SENT,
        expiresAt: addDaysUtc(today, 5),
        observations: "[SEED_DEMO] Simulacao enviada por WhatsApp",
      },
      {
        clientId: byIndex(4).id,
        principalAmount: 2500,
        interestType: LoanSimulationInterestType.FIXO,
        interestRate: 0,
        fixedFeeAmount: 450,
        installmentsCount: 5,
        startDateIso: toIsoDateOnly(addDaysUtc(today, -30)),
        firstDueDateIso: toIsoDateOnly(addDaysUtc(today, -10)),
        status: LoanSimulationStatus.EXPIRED,
        expiresAt: addDaysUtc(today, -1),
        observations: "[SEED_DEMO] Simulacao expirada",
      },
    ] as const;

    for (const seed of simulationSeeds) {
      const built = buildSimulationSeedPayload({
        principalAmount: seed.principalAmount,
        interestType: seed.interestType,
        interestRate: seed.interestRate,
        fixedFeeAmount: seed.fixedFeeAmount,
        installmentsCount: seed.installmentsCount,
        startDateIso: seed.startDateIso,
        firstDueDateIso: seed.firstDueDateIso,
        todayIso,
        observations: seed.observations,
      });

      await tx.loanSimulation.create({
        data: {
          ownerUserId: adminUser.id,
          clientId: seed.clientId,
          principalAmount: seed.principalAmount,
          interestType: seed.interestType,
          interestRate: seed.interestRate,
          fixedFeeAmount: seed.interestType === LoanSimulationInterestType.FIXO ? seed.fixedFeeAmount : null,
          installmentsCount: seed.installmentsCount,
          firstDueDate: built.firstDueDate,
          scheduleJson: built.scheduleJson as Prisma.JsonObject,
          totalsJson: built.totalsJson as Prisma.JsonObject,
          status: seed.status,
          expiresAt: seed.expiresAt,
        },
      });
    }
  });

  const [clientsCount, loansCount, installmentsCount, paymentsCount, simulationsCount] = await Promise.all([
    prisma.client.count({
      where: {
        ownerUserId: adminUser.id,
        cpf: { in: demoCpfs },
      },
    }),
    prisma.loan.count({
      where: {
        ownerUserId: adminUser.id,
        client: {
          ownerUserId: adminUser.id,
          cpf: { in: demoCpfs },
        },
      },
    }),
    prisma.installment.count({
      where: {
        ownerUserId: adminUser.id,
        client: {
          ownerUserId: adminUser.id,
          cpf: { in: demoCpfs },
        },
      },
    }),
    prisma.payment.count({
      where: {
        ownerUserId: adminUser.id,
        loan: {
          ownerUserId: adminUser.id,
          client: {
            ownerUserId: adminUser.id,
            cpf: { in: demoCpfs },
          },
        },
      },
    }),
    prisma.loanSimulation.count({
      where: {
        ownerUserId: adminUser.id,
      },
    }),
  ]);

  console.log("Seed demo concluido.");
  console.log(`Admin: ${adminUser.email}`);
  console.log(`Clientes demo: ${clientsCount}`);
  console.log(`Emprestimos demo: ${loansCount}`);
  console.log(`Parcelas demo: ${installmentsCount}`);
  console.log(`Pagamentos demo: ${paymentsCount}`);
  console.log(`Simulacoes demo: ${simulationsCount}`);
}

main()
  .catch((error) => {
    console.error("Erro no seed demo:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
