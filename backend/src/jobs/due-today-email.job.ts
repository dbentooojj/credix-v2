import { env } from "../config/env";
import {
  getHourMinuteInTimeZone,
  getIsoTodayInTimeZone,
  normalizeTimeZone,
} from "../lib/date-time";
import { sendDueTodayInstallmentsEmail } from "../services/email-reminder.service";

const JOB_TICK_MS = 30_000;

let jobTimer: NodeJS.Timeout | null = null;
let jobBusy = false;
let jobLastRunDate: string | null = null;

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function startDueTodayEmailJob(): void {
  if (jobTimer) return;

  if (!env.EMAIL_NOTIFY_ENABLED) {
    console.log("[due-today-email-job] Job desativado (EMAIL_NOTIFY_ENABLED=false).");
    return;
  }

  const timeZone = normalizeTimeZone(env.EMAIL_NOTIFY_TZ);
  const scheduleTime = env.EMAIL_NOTIFY_TIME;

  console.log(`[due-today-email-job] Job iniciado. Execucao diaria as ${scheduleTime} (${timeZone}).`);

  const run = async (label: string) => {
    const todayIso = getIsoTodayInTimeZone(timeZone);

    try {
      const result = await sendDueTodayInstallmentsEmail({
        force: true,
        targetDateIso: todayIso,
        timeZone,
      });

      console.log(`[due-today-email-job] (${label}) Quantidade de parcelas encontradas: ${result.dueCount}`);
      console.log(`[due-today-email-job] (${label}) Total calculado: ${formatCurrency(result.totalAmount)}`);

      if (!result.ok) {
        console.error(`[due-today-email-job] (${label}) Erro no envio do e-mail: ${result.message}`);
      } else {
        console.log(`[due-today-email-job] (${label}) Sucesso no envio do e-mail.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[due-today-email-job] (${label}) Erro no envio do e-mail: ${message}`);
    }
  };

  const tick = async () => {
    if (jobBusy) return;

    const todayIso = getIsoTodayInTimeZone(timeZone);
    const hourMinute = getHourMinuteInTimeZone(timeZone);
    if (hourMinute !== scheduleTime) return;
    if (jobLastRunDate === todayIso) return;

    jobBusy = true;
    try {
      await run("agendado");
      jobLastRunDate = todayIso;
    } finally {
      jobBusy = false;
    }
  };

  jobTimer = setInterval(() => {
    void tick();
  }, JOB_TICK_MS);

  if (env.EMAIL_NOTIFY_RUN_ON_START) {
    void (async () => {
      if (jobBusy) return;
      jobBusy = true;
      try {
        await run("startup");
        jobLastRunDate = getIsoTodayInTimeZone(timeZone);
      } finally {
        jobBusy = false;
      }
    })();
  }
}
