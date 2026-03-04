import { AppShell } from "@/components/app-shell";
import { KaraokePlayer } from "@/features/player/karaoke-player";

type PlayerPageProps = {
  params: {
    songId: string;
  };
};

export default function PlayerPage({ params }: PlayerPageProps) {
  return (
    <AppShell>
      <KaraokePlayer songId={params.songId} />
    </AppShell>
  );
}
