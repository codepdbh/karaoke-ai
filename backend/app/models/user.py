from __future__ import annotations

from sqlalchemy import Enum, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin
from backend.app.models.enums import AuthProvider, UserRole


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(120))
    last_name: Mapped[str | None] = mapped_column(String(120))
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    auth_provider: Mapped[AuthProvider] = mapped_column(
        Enum(AuthProvider, name="auth_provider"), default=AuthProvider.local, nullable=False
    )
    google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True)
    bound_ip: Mapped[str | None] = mapped_column(String(64), index=True)
    credits_remaining: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), default=UserRole.listener, nullable=False
    )

    songs = relationship("Song", back_populates="creator")
    lyrics_versions = relationship("LyricsVersion", back_populates="creator")
    playlists = relationship("Playlist", back_populates="user")

    @property
    def password_enabled(self) -> bool:
        return bool(self.password_hash)
