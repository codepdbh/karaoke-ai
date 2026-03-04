import { AppShell } from "@/components/app-shell";
import { JobDetail } from "@/features/jobs/job-detail";

type JobDetailPageProps = {
  params: {
    jobId: string;
  };
};

export default function JobDetailPage({ params }: JobDetailPageProps) {
  return (
    <AppShell>
      <JobDetail jobId={params.jobId} />
    </AppShell>
  );
}
