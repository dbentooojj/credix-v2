type SectionTitleProps = {
  title: string;
};

export function SectionTitle({ title }: SectionTitleProps) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
      {title}
    </h3>
  );
}
