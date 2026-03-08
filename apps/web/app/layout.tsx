import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-interface",
});

export const metadata: Metadata = {
  title: {
    default: "Credix V2",
    template: "%s | Credix V2",
  },
  description: "Frontend administrativo padronizado para o Credix V2.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-interface`}>{children}</body>
    </html>
  );
}
