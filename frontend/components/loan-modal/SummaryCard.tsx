import { cardSurfaceClass } from "./utils";

type SummaryCardItem = {
  label: string;
  value: string;
};

type SummaryCardProps = {
  title: string;
  items: SummaryCardItem[];
  actionLabel: string;
};

export function SummaryCard({ title, items, actionLabel }: SummaryCardProps) {
  return (
    <aside className={`${cardSurfaceClass} flex h-full min-h-[420px] flex-col p-5 md:p-6`}>
      <h3 className="text-xl font-semibold text-slate-100">{title}</h3>

      <dl className="mt-6 space-y-4">
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <dt className="text-sm text-slate-400">{item.label}</dt>
            <dd className="text-base font-semibold text-slate-100">{item.value}</dd>
          </div>
        ))}
      </dl>

      <button
        type="submit"
        className="mt-auto inline-flex h-12 w-full items-center justify-center rounded-xl border border-teal-300/40 bg-gradient-to-r from-cyan-600/75 via-teal-500/75 to-cyan-600/75 px-5 text-base font-semibold text-white shadow-[0_6px_28px_rgba(45,212,191,0.32)] transition duration-200 hover:from-cyan-500 hover:via-teal-400 hover:to-cyan-500"
      >
        {actionLabel}
      </button>
    </aside>
  );
}
