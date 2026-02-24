import { NewLoanModal } from "../components/loan-modal";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(45,212,191,0.2),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.12),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(15,23,42,0.8),transparent_50%)]" />
      <NewLoanModal />
    </main>
  );
}
