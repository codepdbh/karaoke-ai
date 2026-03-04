import { AppShell } from "@/components/app-shell";
import { JobList } from "@/features/jobs/job-list";

export default function JobsPage() {
  return (
    <AppShell>
      <JobList />
    </AppShell>
  );
}
