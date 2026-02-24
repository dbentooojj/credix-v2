"use client";

import { useMemo, useState } from "react";
import { Input } from "./Input";
import { ModalContainer } from "./ModalContainer";
import { SectionTitle } from "./SectionTitle";
import { Select } from "./Select";
import { SummaryCard } from "./SummaryCard";
import { Toggle } from "./Toggle";
import { cardSurfaceClass, cn, fieldControlBaseClass } from "./utils";

const clientOptions = [
  { label: "Selecione o cliente", value: "" },
  { label: "Leon Silva", value: "leon-silva" },
  { label: "Aline Souza", value: "aline-souza" },
  { label: "Diego Bento", value: "diego-bento" },
];

const interestOptions = [
  { label: "Composto %", value: "compound" },
  { label: "Simples %", value: "simple" },
];

export function NewLoanModal() {
  const [calcByInstallmentAmount, setCalcByInstallmentAmount] = useState(true);
  const [principal, setPrincipal] = useState("0,00");
  const [installments, setInstallments] = useState("a definir");
  const [rate, setRate] = useState("8");
  const [firstDueDate, setFirstDueDate] = useState("25/03/2026");

  const summaryItems = useMemo(
    () => [
      { label: "Valor", value: `R$ ${principal || "0,00"}` },
      { label: "Parcelas", value: installments ? `${installments}x` : "a definir" },
      { label: "Taxa", value: `${rate || "0"}%` },
      { label: "1o vencimento", value: firstDueDate || "--/--/----" },
    ],
    [firstDueDate, installments, principal, rate],
  );

  return (
    <ModalContainer
      title="Novo emprestimo"
      subtitle="Defina as informacoes, condicoes e agenda do contrato."
    >
      <form className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <div className={cn(cardSurfaceClass, "space-y-8 p-5 md:p-6")}>
          <section className="space-y-4">
            <SectionTitle title="Informacoes basicas" />
            <div className="grid gap-4 md:grid-cols-2">
              <Select label="Cliente" options={clientOptions} defaultValue="" />
              <Input
                label="Valor principal (R$)"
                inputMode="decimal"
                value={principal}
                onChange={(event) => setPrincipal(event.currentTarget.value)}
                emphasis
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle title="Condicoes" />
            <div className="grid gap-4 md:grid-cols-3">
              <Select label="Tipo de juros" options={interestOptions} defaultValue="compound" />
              <Input
                label="Taxa mensal (%)*"
                placeholder="Ex: 8"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.currentTarget.value)}
              />
              <Input
                label="Parcelas*"
                placeholder="Ex: 12"
                inputMode="numeric"
                value={installments}
                onChange={(event) => setInstallments(event.currentTarget.value)}
              />
            </div>
            <Toggle
              id="calc-by-installment"
              checked={calcByInstallmentAmount}
              onChange={setCalcByInstallmentAmount}
              label="Calcular por valor da parcela"
              helperText="Define parcelas automaticamente."
            />
          </section>

          <section className="space-y-4">
            <SectionTitle title="Datas" />
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="Data de inicio" type="date" defaultValue="2026-02-23" />
              <Input
                label="1o vencimento"
                type="date"
                defaultValue="2026-03-25"
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (!value) {
                    setFirstDueDate("");
                    return;
                  }
                  const [year, month, day] = value.split("-");
                  setFirstDueDate(`${day}/${month}/${year}`);
                }}
              />
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle title="Observacoes" />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-300/85">Detalhes adicionais</label>
              <textarea
                className={cn(fieldControlBaseClass, "h-28 resize-none py-3")}
                placeholder="Observacoes sobre o emprestimo"
              />
            </div>
          </section>
        </div>

        <SummaryCard title="Resumo do emprestimo" items={summaryItems} actionLabel="Salvar emprestimo" />
      </form>
    </ModalContainer>
  );
}
