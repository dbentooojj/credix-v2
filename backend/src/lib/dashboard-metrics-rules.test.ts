import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDashboardAdjustments,
  getDashboardTransactionImpact,
  type DashboardMetricsBase,
} from "./dashboard-metrics-rules";

function buildBaseMetrics(): DashboardMetricsBase {
  return {
    cashBalanceBase: 10_000,
    receivedThisMonth: 4_800,
    profitThisMonth: 1_250,
    profitTotal: 9_000,
    roiRate: 18,
    totalOverdue: 1_100,
    totalLoaned: 50_000,
  };
}

test("separa transacao de receita e ajuste manual", () => {
  const revenueImpact = getDashboardTransactionImpact("revenue");
  const adjustmentImpact = getDashboardTransactionImpact("adjustment");

  assert.equal(revenueImpact.isAdjustment, false);
  assert.equal(revenueImpact.affectsRevenue, true);

  assert.equal(adjustmentImpact.isAdjustment, true);
  assert.equal(adjustmentImpact.affectsRevenue, false);
  assert.equal(adjustmentImpact.affectsProfit, false);
});

test("ajuste manual afeta apenas saldo", () => {
  const base = buildBaseMetrics();
  const withAdjustment = applyDashboardAdjustments(base, [
    { type: "adjustment", amountSigned: 700 },
  ]);

  assert.equal(withAdjustment.cashBalance, 10_700);
  assert.equal(withAdjustment.cashAdjustmentNet, 700);
});

test("ajuste manual nao altera lucro", () => {
  const base = buildBaseMetrics();
  const withAdjustment = applyDashboardAdjustments(base, [
    { type: "adjustment", amountSigned: -350 },
  ]);

  assert.equal(withAdjustment.profitThisMonth, base.profitThisMonth);
  assert.equal(withAdjustment.profitTotal, base.profitTotal);
});

test("ajuste manual nao altera ROI", () => {
  const base = buildBaseMetrics();
  const withAdjustment = applyDashboardAdjustments(base, [
    { type: "adjustment", amountSigned: 1_000 },
  ]);

  assert.equal(withAdjustment.roiRate, base.roiRate);
  assert.equal(withAdjustment.totalLoaned, base.totalLoaned);
});

test("ajuste manual nao altera receitas do mes", () => {
  const base = buildBaseMetrics();
  const withAdjustment = applyDashboardAdjustments(base, [
    { type: "adjustment", amountSigned: 2_500 },
  ]);

  assert.equal(withAdjustment.receivedThisMonth, base.receivedThisMonth);
});

test("ajuste manual nao altera em atraso", () => {
  const base = buildBaseMetrics();
  const withAdjustment = applyDashboardAdjustments(base, [
    { type: "adjustment", amountSigned: -2_000 },
  ]);

  assert.equal(withAdjustment.totalOverdue, base.totalOverdue);
});

test("aplicador ignora transacao que nao e ajuste manual", () => {
  const base = buildBaseMetrics();
  const result = applyDashboardAdjustments(base, [
    { type: "revenue", amountSigned: 900 },
    { type: "expense", amountSigned: -400 },
  ]);

  assert.equal(result.cashAdjustmentNet, 0);
  assert.equal(result.cashBalance, base.cashBalanceBase);
});
