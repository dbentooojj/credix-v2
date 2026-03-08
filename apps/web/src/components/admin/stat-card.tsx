import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";

type StatCardProps = {
  eyebrow: string;
  value: string;
  title: string;
  note: string;
};

export function StatCard({ eyebrow, value, title, note }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card/75">
      <CardHeader className="space-y-4">
        <Badge variant="outline" className="w-fit">
          {eyebrow}
        </Badge>
        <div className="text-4xl font-semibold tracking-[-0.08em] text-foreground">{value}</div>
      </CardHeader>
      <CardContent className="space-y-2">
        <CardTitle className="text-xl">{title}</CardTitle>
        <p className="text-sm leading-7 text-muted-foreground">{note}</p>
      </CardContent>
    </Card>
  );
}
