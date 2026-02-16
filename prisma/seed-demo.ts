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

function generatePhone(seed: number): string {
  const dd = "47";
  const suffix = String(900_000_000 + seed).padStart(9, "0").slice(0, 9);
  return `${dd}${suffix}`;
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

  await prisma.user.upsert({
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

  return email;
}

async function main() {
  const adminEmail = await seedAdminUser();
  const timeZone = process.env.SEED_TZ || "America/Sao_Paulo";
  const todayIso = getIsoTodayInTimeZone(timeZone);
  const today = isoToUtcDateOnly(todayIso);

  const demoCount = 18;
  const demoCpfs = Array.from({ length: demoCount }, (_, index) => generateCpf(index + 1));

  const demoNames = [
    "Cliente Demo Atrasado",
    "Cliente Demo Em Dia",
    "Cliente Demo Quitado",
    "Cliente Demo Vence Hoje",
    "Cliente Demo Sem Email",
    "Cliente Demo Nome Muito Muito Muito Grande Para Testar Layout no Mobile",
  ];

  await prisma.$transaction(async (tx) => {
    // Remove o dataset demo anterior (somente os CPFs gerados aqui).
    await tx.client.deleteMany({ where: { cpf: { in: demoCpfs } } });

    const clients = [];
    for (let index = 0; index < demoCount; index += 1) {
      const id = index + 1;
      const cpf = demoCpfs[index];
      const name = demoNames[index] || `Cliente Demo ${String(id).padStart(2, "0")}`;

      const created = await tx.client.create({
        data: {
          name,
          cpf,
          phone: generatePhone(id),
          email: id === 5 ? null : `cliente.demo.${id}@credfacil.local`,
          status: id % 9 === 0 ? ClientStatus.INATIVO : ClientStatus.ATIVO,
          address: id % 4 === 0 ? null : `Rua Teste, ${id} - Centro`,
          notes: "Dataset demo (seed)",
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
            label: "Emprestimo demo (misto, atrasos)",
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
            label: "Emprestimo demo (em dia)",
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
            label: "Emprestimo demo (quitado)",
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
            label: "Emprestimo demo (vence hoje e proximo)",
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
            label: "Emprestimo demo (somente em aberto)",
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
            label: "Emprestimo demo (atraso alto)",
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
            label: "Emprestimo demo (atraso medio)",
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
            label: "Emprestimo demo (pequeno, misto)",
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
  });

  const [clientsCount, loansCount, installmentsCount, paymentsCount] = await Promise.all([
    prisma.client.count({ where: { cpf: { in: demoCpfs } } }),
    prisma.loan.count({ where: { client: { cpf: { in: demoCpfs } } } }),
    prisma.installment.count({ where: { client: { cpf: { in: demoCpfs } } } }),
    prisma.payment.count({ where: { loan: { client: { cpf: { in: demoCpfs } } } } }),
  ]);

  console.log("Seed demo concluido.");
  console.log(`Admin: ${adminEmail}`);
  console.log(`Clientes demo: ${clientsCount}`);
  console.log(`Emprestimos demo: ${loansCount}`);
  console.log(`Parcelas demo: ${installmentsCount}`);
  console.log(`Pagamentos demo: ${paymentsCount}`);
}

main()
  .catch((error) => {
    console.error("Erro no seed demo:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
