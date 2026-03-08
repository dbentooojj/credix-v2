import type { ReactNode } from "react";
import { AdminShell } from "@/src/components/admin/admin-shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
