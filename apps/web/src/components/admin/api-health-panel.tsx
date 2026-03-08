"use client";

import { startTransition, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, LoaderCircle, Server, ShieldCheck } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { getApiSnapshot, type ApiSnapshot } from "@/src/lib/api";

type LoadState =
  | { status: "loading"; snapshot: null; error: null }
  | { status: "ready"; snapshot: ApiSnapshot; error: null }
  | { status: "error"; snapshot: null; error: string };

export function ApiHealthPanel() {
  const [state, setState] = useState<LoadState>({
    status: "loading",
    snapshot: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const snapshot = await getApiSnapshot();
        if (cancelled) return;

        startTransition(() => {
          setState({ status: "ready", snapshot, error: null });
        });
      } catch (error) {
        if (cancelled) return;

        startTransition(() => {
          setState({
            status: "error",
            snapshot: null,
            error: error instanceof Error ? error.message : "Falha ao consultar a API.",
          });
        });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <Card className="border-border/60 bg-card/75">
        <CardHeader className="space-y-4">
          <Badge className="w-fit">API status</Badge>
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <LoaderCircle className="size-5 animate-spin text-primary" />
              Conectando com o backend novo
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">
              Validando os endpoints base para o shell administrativo.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card className="border-destructive/30 bg-card/75">
        <CardHeader className="space-y-4">
          <Badge variant="destructive" className="w-fit">
            API offline
          </Badge>
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <AlertTriangle className="size-5 text-destructive" />
              Backend indisponivel
            </CardTitle>
            <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">
              {state.error}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const { health, meta, baseUrl } = state.snapshot;

  return (
    <Card className="border-border/60 bg-card/75">
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className="w-fit">API status</Badge>
          <Badge variant="success" className="w-fit">
            Health ok
          </Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ShieldCheck className="size-5 text-success" />
            Backend novo respondendo
          </CardTitle>
          <CardDescription className="text-sm leading-7 text-muted-foreground md:text-base">
            A UI ja consegue consultar a base em <span className="font-medium text-foreground">{baseUrl}</span>.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <StatusCell icon={<Server className="size-4" />} label="Servico" value={health?.service || "desconhecido"} />
        <StatusCell label="Nome" value={meta?.name || "nao informado"} />
        <StatusCell label="Versao" value={meta?.version || "nao informada"} />
      </CardContent>
    </Card>
  );
}

function StatusCell({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-border/60 bg-background/35 px-4 py-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
