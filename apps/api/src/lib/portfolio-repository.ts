import { getDatabasePool } from "./database";
import type {
  PortfolioInstallment,
  PortfolioLoan,
  PortfolioLoanSimulation,
  PortfolioLoanSimulationStatus,
  PortfolioInstallmentStatus,
} from "./portfolio-store";

type PortfolioLoanRow = {
  id: string;
  customerName: string;
  principalAmount: number;
  issuedAt: string;
  firstDueDate: string;
  interestType: PortfolioLoan["interestType"];
  interestRate: number;
  fixedFeeAmount: number;
  observations: string;
};

type PortfolioInstallmentRow = {
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

type PortfolioLoanSimulationRow = {
  id: string;
  customerName: string;
  principalAmount: number;
  totalAmount: number;
  installmentsCount: number;
  interestType: PortfolioLoan["interestType"];
  interestRate: number;
  fixedFeeAmount: number;
  status: PortfolioLoanSimulationStatus;
  expiresAt: string;
};

function toLoanId(id: string) {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapLoanRow(row: PortfolioLoanRow): PortfolioLoan {
  return {
    id: String(row.id),
    customerName: row.customerName,
    principalAmount: Number(row.principalAmount),
    issuedAt: row.issuedAt,
    firstDueDate: row.firstDueDate,
    interestType: row.interestType,
    interestRate: Number(row.interestRate),
    fixedFeeAmount: Number(row.fixedFeeAmount),
    observations: row.observations,
  };
}

function mapInstallmentRow(row: PortfolioInstallmentRow): PortfolioInstallment {
  return {
    id: row.id,
    loanId: String(row.loanId),
    customerName: row.customerName,
    installmentNumber: Number(row.installmentNumber),
    totalInstallments: Number(row.totalInstallments),
    dueDate: row.dueDate,
    paidDate: row.paidDate,
    principalAmount: Number(row.principalAmount),
    interestAmount: Number(row.interestAmount),
    amount: Number(row.amount),
    status: row.status,
  };
}

function mapSimulationRow(row: PortfolioLoanSimulationRow): PortfolioLoanSimulation {
  return {
    id: row.id,
    customerName: row.customerName,
    principalAmount: Number(row.principalAmount),
    totalAmount: Number(row.totalAmount),
    installmentsCount: Number(row.installmentsCount),
    interestType: row.interestType,
    interestRate: Number(row.interestRate),
    fixedFeeAmount: Number(row.fixedFeeAmount),
    status: row.status,
    expiresAt: row.expiresAt,
  };
}

export async function listPortfolioLoans() {
  const result = await getDatabasePool().query<PortfolioLoanRow>(`
    SELECT
      id::text AS id,
      customer_name AS "customerName",
      principal_amount::double precision AS "principalAmount",
      issued_at AS "issuedAt",
      first_due_date AS "firstDueDate",
      interest_type AS "interestType",
      interest_rate::double precision AS "interestRate",
      fixed_fee_amount::double precision AS "fixedFeeAmount",
      observations
    FROM portfolio_loans
    ORDER BY id DESC
  `);

  return result.rows.map(mapLoanRow);
}

export async function getPortfolioLoan(id: string) {
  const loanId = toLoanId(id);
  if (!loanId) return null;

  const result = await getDatabasePool().query<PortfolioLoanRow>(
    `
      SELECT
        id::text AS id,
        customer_name AS "customerName",
        principal_amount::double precision AS "principalAmount",
        issued_at AS "issuedAt",
        first_due_date AS "firstDueDate",
        interest_type AS "interestType",
        interest_rate::double precision AS "interestRate",
        fixed_fee_amount::double precision AS "fixedFeeAmount",
        observations
      FROM portfolio_loans
      WHERE id = $1
    `,
    [loanId],
  );

  return result.rows[0] ? mapLoanRow(result.rows[0]) : null;
}

export async function createPortfolioLoan(payload: Omit<PortfolioLoan, "id">) {
  const result = await getDatabasePool().query<PortfolioLoanRow>(
    `
      INSERT INTO portfolio_loans (
        customer_name,
        principal_amount,
        issued_at,
        first_due_date,
        interest_type,
        interest_rate,
        fixed_fee_amount,
        observations
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id::text AS id,
        customer_name AS "customerName",
        principal_amount::double precision AS "principalAmount",
        issued_at AS "issuedAt",
        first_due_date AS "firstDueDate",
        interest_type AS "interestType",
        interest_rate::double precision AS "interestRate",
        fixed_fee_amount::double precision AS "fixedFeeAmount",
        observations
    `,
    [
      payload.customerName,
      payload.principalAmount,
      payload.issuedAt,
      payload.firstDueDate,
      payload.interestType,
      payload.interestRate,
      payload.fixedFeeAmount,
      payload.observations,
    ],
  );

  return mapLoanRow(result.rows[0]);
}

export async function updatePortfolioLoan(id: string, payload: Partial<Omit<PortfolioLoan, "id">>) {
  const loanId = toLoanId(id);
  if (!loanId) return null;

  const updates: string[] = [];
  const values: Array<string | number> = [];

  if (payload.customerName !== undefined) {
    updates.push(`customer_name = $${values.length + 1}`);
    values.push(payload.customerName);
  }
  if (payload.principalAmount !== undefined) {
    updates.push(`principal_amount = $${values.length + 1}`);
    values.push(payload.principalAmount);
  }
  if (payload.issuedAt !== undefined) {
    updates.push(`issued_at = $${values.length + 1}`);
    values.push(payload.issuedAt);
  }
  if (payload.firstDueDate !== undefined) {
    updates.push(`first_due_date = $${values.length + 1}`);
    values.push(payload.firstDueDate);
  }
  if (payload.interestType !== undefined) {
    updates.push(`interest_type = $${values.length + 1}`);
    values.push(payload.interestType);
  }
  if (payload.interestRate !== undefined) {
    updates.push(`interest_rate = $${values.length + 1}`);
    values.push(payload.interestRate);
  }
  if (payload.fixedFeeAmount !== undefined) {
    updates.push(`fixed_fee_amount = $${values.length + 1}`);
    values.push(payload.fixedFeeAmount);
  }
  if (payload.observations !== undefined) {
    updates.push(`observations = $${values.length + 1}`);
    values.push(payload.observations);
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(loanId);

  const result = await getDatabasePool().query<PortfolioLoanRow>(
    `
      UPDATE portfolio_loans
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id::text AS id,
        customer_name AS "customerName",
        principal_amount::double precision AS "principalAmount",
        issued_at AS "issuedAt",
        first_due_date AS "firstDueDate",
        interest_type AS "interestType",
        interest_rate::double precision AS "interestRate",
        fixed_fee_amount::double precision AS "fixedFeeAmount",
        observations
    `,
    values,
  );

  return result.rows[0] ? mapLoanRow(result.rows[0]) : null;
}

export async function listPortfolioInstallments() {
  const result = await getDatabasePool().query<PortfolioInstallmentRow>(`
    SELECT
      id,
      loan_id::text AS "loanId",
      customer_name AS "customerName",
      installment_number AS "installmentNumber",
      total_installments AS "totalInstallments",
      due_date AS "dueDate",
      paid_date AS "paidDate",
      principal_amount::double precision AS "principalAmount",
      interest_amount::double precision AS "interestAmount",
      amount::double precision AS amount,
      status
    FROM portfolio_installments
    ORDER BY due_date ASC, amount DESC, id ASC
  `);

  return result.rows.map(mapInstallmentRow);
}

export async function getPortfolioInstallment(id: string) {
  const result = await getDatabasePool().query<PortfolioInstallmentRow>(
    `
      SELECT
        id,
        loan_id::text AS "loanId",
        customer_name AS "customerName",
        installment_number AS "installmentNumber",
        total_installments AS "totalInstallments",
        due_date AS "dueDate",
        paid_date AS "paidDate",
        principal_amount::double precision AS "principalAmount",
        interest_amount::double precision AS "interestAmount",
        amount::double precision AS amount,
        status
      FROM portfolio_installments
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ? mapInstallmentRow(result.rows[0]) : null;
}

export async function replacePortfolioLoanInstallments(
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
  const db = getDatabasePool();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM portfolio_installments WHERE loan_id = $1", [loanId]);

    const created: PortfolioInstallment[] = [];
    for (const [index, installment] of nextInstallments.entries()) {
      const result = await client.query<PortfolioInstallmentRow>(
        `
          INSERT INTO portfolio_installments (
            id,
            loan_id,
            customer_name,
            installment_number,
            total_installments,
            due_date,
            paid_date,
            principal_amount,
            interest_amount,
            amount,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING
            id,
            loan_id::text AS "loanId",
            customer_name AS "customerName",
            installment_number AS "installmentNumber",
            total_installments AS "totalInstallments",
            due_date AS "dueDate",
            paid_date AS "paidDate",
            principal_amount::double precision AS "principalAmount",
            interest_amount::double precision AS "interestAmount",
            amount::double precision AS amount,
            status
        `,
        [
          `${loanId}-${index + 1}`,
          Number(loanId),
          customerName,
          index + 1,
          nextInstallments.length,
          installment.dueDate,
          installment.paidDate ?? null,
          installment.principalAmount,
          installment.interestAmount,
          installment.amount,
          installment.status,
        ],
      );

      created.push(mapInstallmentRow(result.rows[0]));
    }

    await client.query("COMMIT");
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePortfolioInstallment(
  id: string,
  payload: Partial<Omit<PortfolioInstallment, "id" | "loanId" | "customerName" | "installmentNumber" | "totalInstallments">>,
) {
  const updates: string[] = [];
  const values: Array<string | number | null> = [];

  if (payload.dueDate !== undefined) {
    updates.push(`due_date = $${values.length + 1}`);
    values.push(payload.dueDate);
  }
  if (payload.paidDate !== undefined) {
    updates.push(`paid_date = $${values.length + 1}`);
    values.push(payload.paidDate);
  }
  if (payload.principalAmount !== undefined) {
    updates.push(`principal_amount = $${values.length + 1}`);
    values.push(payload.principalAmount);
  }
  if (payload.interestAmount !== undefined) {
    updates.push(`interest_amount = $${values.length + 1}`);
    values.push(payload.interestAmount);
  }
  if (payload.amount !== undefined) {
    updates.push(`amount = $${values.length + 1}`);
    values.push(payload.amount);
  }
  if (payload.status !== undefined) {
    updates.push(`status = $${values.length + 1}`);
    values.push(payload.status);
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(id);

  const result = await getDatabasePool().query<PortfolioInstallmentRow>(
    `
      UPDATE portfolio_installments
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${values.length}
      RETURNING
        id,
        loan_id::text AS "loanId",
        customer_name AS "customerName",
        installment_number AS "installmentNumber",
        total_installments AS "totalInstallments",
        due_date AS "dueDate",
        paid_date AS "paidDate",
        principal_amount::double precision AS "principalAmount",
        interest_amount::double precision AS "interestAmount",
        amount::double precision AS amount,
        status
    `,
    values,
  );

  return result.rows[0] ? mapInstallmentRow(result.rows[0]) : null;
}

export async function listPortfolioLoanSimulations() {
  const result = await getDatabasePool().query<PortfolioLoanSimulationRow>(`
    SELECT
      id,
      customer_name AS "customerName",
      principal_amount::double precision AS "principalAmount",
      total_amount::double precision AS "totalAmount",
      installments_count AS "installmentsCount",
      interest_type AS "interestType",
      interest_rate::double precision AS "interestRate",
      fixed_fee_amount::double precision AS "fixedFeeAmount",
      status,
      expires_at AS "expiresAt"
    FROM portfolio_loan_simulations
    ORDER BY expires_at ASC, id ASC
  `);

  return result.rows.map(mapSimulationRow);
}
