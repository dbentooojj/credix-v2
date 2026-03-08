import { Check } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";

type ChecklistCardProps = {
  eyebrow: string;
  title: string;
  text: string;
  items: string[];
};

export function ChecklistCard({ eyebrow, title, text, items }: ChecklistCardProps) {
  return (
    <Card className="border-border/60 bg-card/75">
      <CardHeader className="space-y-4">
        <Badge variant="outline" className="w-fit">
          {eyebrow}
        </Badge>
        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
          <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">{text}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-[22px] border border-border/60 bg-background/30 px-4 py-4"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="size-4" />
              </span>
              <span className="text-sm leading-7 text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
