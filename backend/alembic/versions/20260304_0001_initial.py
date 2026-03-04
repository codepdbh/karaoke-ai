"""Initial schema for karaoke-ai."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260304_0001"
down_revision = None
branch_labels = None
depends_on = None


user_role = postgresql.ENUM("admin", "editor", "listener", name="user_role", create_type=False)
song_status = postgresql.ENUM("uploaded", "processing", "ready", "failed", name="song_status", create_type=False)
song_source_type = postgresql.ENUM("upload", "import", name="song_source_type", create_type=False)
song_file_type = postgresql.ENUM(
    "original",
    "vocals",
    "instrumental",
    "waveform",
    "lyrics_json",
    "lrc",
    "cover",
    name="song_file_type",
    create_type=False,
)
lyrics_version_source_type = postgresql.ENUM(
    "manual",
    "external_reference",
    "local_transcription",
    "merged",
    name="lyrics_version_source_type",
    create_type=False,
)
lyrics_source_provider = postgresql.ENUM(
    "none", "lrclib", "manual", "local", name="lyrics_source_provider", create_type=False
)
lyrics_version_status = postgresql.ENUM(
    "draft",
    "reviewed",
    "published",
    "deprecated",
    name="lyrics_version_status",
    create_type=False,
)
job_type = postgresql.ENUM("process_song", "export_lrc", "reprocess_lyrics", name="job_type", create_type=False)
job_status = postgresql.ENUM(
    "queued", "running", "completed", "failed", "cancelled", name="job_status", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in (
        user_role,
        song_status,
        song_source_type,
        song_file_type,
        lyrics_version_source_type,
        lyrics_source_provider,
        lyrics_version_status,
        job_type,
        job_status,
    ):
        enum_type.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", user_role, nullable=False, server_default="listener"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("username", name="uq_users_username"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)
    op.create_index("ix_users_username", "users", ["username"], unique=False)

    op.create_table(
        "songs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("artist", sa.String(length=255), nullable=True),
        sa.Column("album", sa.String(length=255), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=12), nullable=True),
        sa.Column("status", song_status, nullable=False, server_default="uploaded"),
        sa.Column("source_type", song_source_type, nullable=False, server_default="upload"),
        sa.Column("audio_fingerprint", sa.String(length=128), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_songs_audio_fingerprint", "songs", ["audio_fingerprint"], unique=False)
    op.create_index("ix_songs_created_by", "songs", ["created_by"], unique=False)
    op.create_index("ix_songs_status", "songs", ["status"], unique=False)
    op.create_index("ix_songs_status_created_at", "songs", ["status", "created_at"], unique=False)
    op.create_index("ix_songs_title_artist", "songs", ["title", "artist"], unique=False)

    op.create_table(
        "song_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("file_type", song_file_type, nullable=False),
        sa.Column("storage_path", sa.String(length=1024), nullable=False),
        sa.Column("mime_type", sa.String(length=255), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("song_id", "file_type", name="uq_song_files_song_id_file_type"),
    )
    op.create_index("ix_song_files_checksum", "song_files", ["checksum"], unique=False)
    op.create_index("ix_song_files_song_id_file_type", "song_files", ["song_id", "file_type"], unique=False)

    op.create_table(
        "lyrics_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("version_name", sa.String(length=255), nullable=False),
        sa.Column("source_type", lyrics_version_source_type, nullable=False),
        sa.Column("source_provider", lyrics_source_provider, nullable=False, server_default="none"),
        sa.Column("status", lyrics_version_status, nullable=False, server_default="draft"),
        sa.Column("language", sa.String(length=12), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.Column("is_locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_lyrics_versions_song_created_at", "lyrics_versions", ["song_id", "created_at"], unique=False)
    op.create_index("ix_lyrics_versions_song_status", "lyrics_versions", ["song_id", "status"], unique=False)

    op.create_table(
        "lyrics_lines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lyrics_version_id", sa.Integer(), nullable=False),
        sa.Column("line_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=2000), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=True),
        sa.Column("end_time", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["lyrics_version_id"], ["lyrics_versions.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_lyrics_lines_version_line", "lyrics_lines", ["lyrics_version_id", "line_index"], unique=False)

    op.create_table(
        "word_timings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lyrics_line_id", sa.Integer(), nullable=False),
        sa.Column("word_index", sa.Integer(), nullable=False),
        sa.Column("word", sa.String(length=255), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=True),
        sa.Column("end_time", sa.Float(), nullable=True),
        sa.Column("confidence_score", sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(["lyrics_line_id"], ["lyrics_lines.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_word_timings_line_word", "word_timings", ["lyrics_line_id", "word_index"], unique=False)

    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("song_id", sa.Integer(), nullable=True),
        sa.Column("job_type", job_type, nullable=False),
        sa.Column("status", job_status, nullable=False, server_default="queued"),
        sa.Column("progress_percent", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("current_step", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.String(length=2000), nullable=True),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("result_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_jobs_song_type", "jobs", ["song_id", "job_type"], unique=False)
    op.create_index("ix_jobs_status_created_at", "jobs", ["status", "created_at"], unique=False)

    op.create_table(
        "playlists",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=1000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_playlists_user_name", "playlists", ["user_id", "name"], unique=False)

    op.create_table(
        "playlist_songs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("playlist_id", sa.Integer(), nullable=False),
        sa.Column("song_id", sa.Integer(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.ForeignKeyConstraint(["playlist_id"], ["playlists.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["song_id"], ["songs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("playlist_id", "song_id", name="uq_playlist_songs_playlist_song"),
    )
    op.create_index("ix_playlist_songs_playlist_sort", "playlist_songs", ["playlist_id", "sort_order"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_playlist_songs_playlist_sort", table_name="playlist_songs")
    op.drop_table("playlist_songs")

    op.drop_index("ix_playlists_user_name", table_name="playlists")
    op.drop_table("playlists")

    op.drop_index("ix_jobs_status_created_at", table_name="jobs")
    op.drop_index("ix_jobs_song_type", table_name="jobs")
    op.drop_table("jobs")

    op.drop_index("ix_word_timings_line_word", table_name="word_timings")
    op.drop_table("word_timings")

    op.drop_index("ix_lyrics_lines_version_line", table_name="lyrics_lines")
    op.drop_table("lyrics_lines")

    op.drop_index("ix_lyrics_versions_song_status", table_name="lyrics_versions")
    op.drop_index("ix_lyrics_versions_song_created_at", table_name="lyrics_versions")
    op.drop_table("lyrics_versions")

    op.drop_index("ix_song_files_song_id_file_type", table_name="song_files")
    op.drop_index("ix_song_files_checksum", table_name="song_files")
    op.drop_table("song_files")

    op.drop_index("ix_songs_title_artist", table_name="songs")
    op.drop_index("ix_songs_status_created_at", table_name="songs")
    op.drop_index("ix_songs_status", table_name="songs")
    op.drop_index("ix_songs_created_by", table_name="songs")
    op.drop_index("ix_songs_audio_fingerprint", table_name="songs")
    op.drop_table("songs")

    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    for enum_type in (
        job_status,
        job_type,
        lyrics_version_status,
        lyrics_source_provider,
        lyrics_version_source_type,
        song_file_type,
        song_source_type,
        song_status,
        user_role,
    ):
        enum_type.drop(bind, checkfirst=True)
