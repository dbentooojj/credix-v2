import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credix V2",
  description: "Frontend padronizado para o Credix.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
