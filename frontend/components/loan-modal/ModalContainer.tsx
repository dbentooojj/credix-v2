import type { ReactNode } from "react";
import { cardSurfaceClass } from "./utils";

type ModalContainerProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function ModalContainer({ title, subtitle, children }: ModalContainerProps) {
  return (
    <div className="relative w-full max-w-6xl">
      <div className="pointer-events-none absolute -left-16 top-1/3 h-52 w-52 rounded-full bg-teal-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-8 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className={`${cardSurfaceClass} relative overflow-hidden`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_40%_0%,rgba(45,212,191,0.16),transparent_48%),radial-gradient(circle_at_85%_85%,rgba(56,189,248,0.12),transparent_45%)]" />

        <header className="relative border-b border-white/10 px-6 py-5 md:px-8">
          <h2 className="text-[34px] font-semibold leading-none tracking-tight text-slate-100">
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-xl text-slate-300 transition duration-200 hover:border-white/20 hover:text-white"
          >
            <span aria-hidden="true">x</span>
          </button>
        </header>

        <div className="relative px-6 py-6 md:px-8 md:py-8">{children}</div>
      </div>
    </div>
  );
}
