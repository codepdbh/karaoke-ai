import { AppShell } from "@/components/app-shell";
import { SongLibrary } from "@/features/songs/song-library";

export default function LibraryPage() {
  return (
    <AppShell>
      <SongLibrary />
    </AppShell>
  );
}
