import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/components/ui/card";
import type { FinanceBlueprint } from "@/src/lib/finance-blueprints";

type ModuleCardProps = {
  blueprint: FinanceBlueprint;
};

export function ModuleCard({ blueprint }: ModuleCardProps) {
  return (
    <Card className="border-border/60 bg-card/75">
      <CardHeader className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge>{blueprint.kicker}</Badge>
          <Badge variant={blueprint.statusTone === "success" ? "success" : "warning"}>{blueprint.statusLabel}</Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-2xl">{blueprint.title}</CardTitle>
          <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">
            {blueprint.summary}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {blueprint.highlights.map((item) => (
            <li
              key={item}
              className="rounded-[22px] border border-border/60 bg-background/30 px-4 py-4 text-sm leading-7 text-muted-foreground"
            >
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button asChild variant="outline">
          <Link href={blueprint.href}>
            Abrir escopo do modulo
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
