import { AppShell } from "@/components/app-shell";
import { DashboardOverview } from "@/features/dashboard/dashboard-overview";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardOverview />
    </AppShell>
  );
}
