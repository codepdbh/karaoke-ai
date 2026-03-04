import { AppShell } from "@/components/app-shell";
import { LyricsEditor } from "@/features/lyrics/lyrics-editor";

type LyricsEditorPageProps = {
  params: {
    versionId: string;
  };
};

export default function LyricsEditorPage({ params }: LyricsEditorPageProps) {
  return (
    <AppShell>
      <LyricsEditor versionId={params.versionId} />
    </AppShell>
  );
}
