export function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

export const fieldControlBaseClass =
  "h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[15px] text-slate-100 placeholder:text-slate-400/80 outline-none transition duration-200 hover:border-white/15 focus:border-teal-400 focus:ring-4 focus:ring-teal-400/20";

export const cardSurfaceClass =
  "rounded-2xl border border-white/10 bg-slate-950/70 shadow-[0_12px_40px_rgba(3,8,20,0.55)] backdrop-blur";
