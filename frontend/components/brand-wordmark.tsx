type BrandWordmarkProps = {
  compact?: boolean;
};

export function BrandWordmark({ compact = false }: BrandWordmarkProps) {
  return (
    <span className="inline-flex select-none flex-col leading-none" aria-label="Credix">
      <span className={`${compact ? "text-2xl" : "text-3xl"} font-semibold tracking-tight`}>
        <span className="text-white">Cred</span>
        <span className="text-[#D8AF2F]">ix</span>
      </span>
      <span className="mt-1 hidden text-[0.52rem] font-semibold uppercase tracking-[0.18em] text-slate-300/90 xl:block">
        Gerenciamento inteligente
      </span>
    </span>
  );
}
