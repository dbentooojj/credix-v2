import type { Metadata } from "next";
import { AppShell } from "../../../components/app-shell";
import { VisaoGeralScreen } from "@/src/legacy-migration/screens/visao-geral/visao-geral-screen";

export const metadata: Metadata = {
  title: "Visao geral",
};

export default function MigrationVisaoGeralPage() {
  return (
    <AppShell>
      <VisaoGeralScreen />
    </AppShell>
  );
}
