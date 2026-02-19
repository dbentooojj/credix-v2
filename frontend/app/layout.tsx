import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credix Frontend",
  description: "Base frontend em Next.js para migracao incremental",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body className="text-slate-100 antialiased">{children}</body>
    </html>
  );
}
