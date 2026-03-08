type ChecklistCardProps = {
  eyebrow: string;
  title: string;
  text: string;
  items: string[];
};

export function ChecklistCard({ eyebrow, title, text, items }: ChecklistCardProps) {
  return (
    <div className="card">
      <p className="card__eyebrow">{eyebrow}</p>
      <h3 className="card__title">{title}</h3>
      <p className="card__text">{text}</p>
      <ul className="checklist">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
