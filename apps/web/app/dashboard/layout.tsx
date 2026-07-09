import type { ReactNode } from "react";
import { DashboardSidebar } from "../_components/dashboard/dashboard-sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative isolate min-h-svh overflow-hidden px-5 py-5 sm:px-8 lg:px-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-28 top-20 -z-10 h-80 w-80 rounded-[44%_56%_61%_39%/47%_39%_61%_53%] bg-[var(--fig-soft)] opacity-35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-28 bottom-10 -z-10 h-96 w-96 rounded-[60%_40%_43%_57%/43%_57%_43%_57%] bg-[var(--absinthe)] opacity-35 blur-3xl"
      />

      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[17rem_1fr]">
        <DashboardSidebar />
        {children}
      </div>
    </main>
  );
}
