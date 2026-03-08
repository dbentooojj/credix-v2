import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { SidebarNav } from "@/src/components/admin/sidebar-nav";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-border/70 bg-background/65 backdrop-blur-2xl lg:border-b-0 lg:border-r">
          <div className="sticky top-0 flex h-full flex-col gap-6 px-4 py-5 sm:px-6 lg:h-screen lg:px-6 lg:py-6">
            <div className="space-y-4">
              <Badge className="w-fit gap-2">
                <Sparkles className="size-3.5" />
                shadcn/ui standard
              </Badge>
              <div className="space-y-2">
                <h1 className="font-display text-4xl leading-none tracking-[-0.08em] text-foreground">Credix V2</h1>
                <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                  API pura no backend. Interface, componentes e experiencia visual concentrados no frontend.
                </p>
              </div>
            </div>

            <SidebarNav />

            <Card className="mt-auto border-border/60 bg-card/80">
              <CardContent className="space-y-4 p-5">
                <Badge variant="outline" className="w-fit">
                  Regra ativa
                </Badge>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">Nada de tela nova no legado</h2>
                  <p className="text-sm leading-7 text-muted-foreground">
                    Tudo que for interface nova deve nascer em <span className="font-medium text-foreground">apps/web</span>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>

        <main className="relative z-10 min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            <Card className="overflow-hidden border-border/60 bg-card/80">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Shell administrativo da nova base</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Fundacao visual com `shadcn/ui`, navegacao central e consumo explicito da API.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="success">Web padronizado</Badge>
                  <Button asChild variant="outline">
                    <Link href="/app/migration">
                      Ver plano de migracao
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
