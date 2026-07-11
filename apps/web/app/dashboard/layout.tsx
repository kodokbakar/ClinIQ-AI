import type { ReactNode } from "react";
import { DashboardSidebar } from "../_components/dashboard/dashboard-sidebar";
import "./dashboard-shell.css";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <main className="diagnostic-shell">
      <DashboardSidebar />
      <div className="diagnostic-main">{children}</div>
    </main>
  );
}
