"use client";

import { startTransition, useEffect, useState } from "react";
import { getApiSnapshot, type ApiSnapshot } from "../../lib/api";

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
      <div className="card">
        <p className="card__eyebrow">API status</p>
        <h3 className="card__title">Conectando com o backend novo</h3>
        <p className="card__text">Validando os endpoints base para o shell administrativo.</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="card">
        <p className="card__eyebrow">API status</p>
        <h3 className="card__title">Backend indisponivel</h3>
        <p className="card__text">{state.error}</p>
        <div className="card__footer">
          <span className="chip chip--danger">Falha de conexao</span>
        </div>
      </div>
    );
  }

  const { health, meta, baseUrl } = state.snapshot;

  return (
    <div className="card">
      <p className="card__eyebrow">API status</p>
      <h3 className="card__title">Backend novo respondendo</h3>
      <p className="card__text">
        A UI ja consegue consultar a base em <span className="muted-code">{baseUrl}</span>.
      </p>

      <div className="status-row">
        <span className="chip chip--success">{health?.status === "ok" ? "Health ok" : "Health ausente"}</span>
        <span className="chip chip--brand">{meta?.architecture || "Sem metadata"}</span>
      </div>

      <ul className="checklist">
        <li>Servico: {health?.service || "desconhecido"}</li>
        <li>Nome: {meta?.name || "nao informado"}</li>
        <li>Versao: {meta?.version || "nao informada"}</li>
      </ul>
    </div>
  );
}
