"use client";

import { useState } from "react";
import { cn } from "@/src/lib/utils";

type LegacyAdminIframeScreenProps = {
  src: string;
  title: string;
  className?: string;
};

export function LegacyAdminIframeScreen({ src, title, className }: LegacyAdminIframeScreenProps) {
  const [loading, setLoading] = useState(true);

  return (
    <section
      className={cn(
        "relative h-[calc(100vh-1.5rem)] w-full overflow-hidden rounded-xl border border-lm-border bg-lm-bg",
        className,
      )}
    >
      <iframe
        className="h-full w-full border-0 bg-transparent"
        onLoad={() => setLoading(false)}
        src={src}
        title={title}
      />

      {loading ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-lm-bg/90 text-sm font-medium text-lm-text-muted">
          Carregando {title.toLowerCase()}...
        </div>
      ) : null}
    </section>
  );
}
