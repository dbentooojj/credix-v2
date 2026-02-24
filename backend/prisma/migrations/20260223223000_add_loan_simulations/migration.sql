CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "LoanSimulationInterestType" AS ENUM ('SIMPLES', 'COMPOSTO', 'FIXO');

-- CreateEnum
CREATE TYPE "LoanSimulationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "LoanSimulation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerUserId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "principalAmount" DECIMAL(14,2) NOT NULL,
    "interestType" "LoanSimulationInterestType" NOT NULL DEFAULT 'COMPOSTO',
    "interestRate" DECIMAL(7,4) NOT NULL,
    "fixedFeeAmount" DECIMAL(14,2),
    "installmentsCount" INTEGER NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "scheduleJson" JSONB NOT NULL,
    "totalsJson" JSONB NOT NULL,
    "status" "LoanSimulationStatus" NOT NULL DEFAULT 'DRAFT',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedLoanId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoanSimulation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoanSimulation_approvedLoanId_key" ON "LoanSimulation"("approvedLoanId");

-- CreateIndex
CREATE INDEX "LoanSimulation_ownerUserId_idx" ON "LoanSimulation"("ownerUserId");

-- CreateIndex
CREATE INDEX "LoanSimulation_clientId_idx" ON "LoanSimulation"("clientId");

-- CreateIndex
CREATE INDEX "LoanSimulation_status_idx" ON "LoanSimulation"("status");

-- CreateIndex
CREATE INDEX "LoanSimulation_expiresAt_idx" ON "LoanSimulation"("expiresAt");

-- CreateIndex
CREATE INDEX "LoanSimulation_createdAt_idx" ON "LoanSimulation"("createdAt");

-- AddForeignKey
ALTER TABLE "LoanSimulation" ADD CONSTRAINT "LoanSimulation_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanSimulation" ADD CONSTRAINT "LoanSimulation_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanSimulation" ADD CONSTRAINT "LoanSimulation_approvedLoanId_fkey" FOREIGN KEY ("approvedLoanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;