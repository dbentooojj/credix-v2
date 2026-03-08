type CredixWordmarkProps = {
  subtitle?: boolean;
};

export function CredixWordmark({ subtitle = true }: CredixWordmarkProps) {
  return (
    <span className="inline-flex select-none flex-col leading-none" aria-label="Credix">
      <span className="text-[1.9rem] font-semibold tracking-[-0.05em] text-white sm:text-[2.15rem]">
        <span>Cred</span>
        <span className="text-[#D8AF2F]">ix</span>
      </span>
      {subtitle ? (
        <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.22em] text-slate-300/90">
          Gerenciamento inteligente
        </span>
      ) : null}
    </span>
  );
}
