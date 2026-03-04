import { AppShell } from "@/components/app-shell";
import { SongDetailView } from "@/features/songs/song-detail";

type SongDetailPageProps = {
  params: {
    songId: string;
  };
};

export default function SongDetailPage({ params }: SongDetailPageProps) {
  return (
    <AppShell>
      <SongDetailView songId={params.songId} />
    </AppShell>
  );
}
