type StatCardProps = {
  eyebrow: string;
  value: string;
  title: string;
  note: string;
};

export function StatCard({ eyebrow, value, title, note }: StatCardProps) {
  return (
    <article className="card">
      <p className="card__eyebrow">{eyebrow}</p>
      <span className="card__value">{value}</span>
      <div>
        <h3 className="card__title">{title}</h3>
        <p className="card__text">{note}</p>
      </div>
    </article>
  );
}
