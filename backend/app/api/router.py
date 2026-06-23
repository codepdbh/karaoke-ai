from __future__ import annotations

from fastapi import APIRouter

from backend.app.api.v1 import admin, auth, jobs, lyrics, music, playlists, songs, uploads

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(uploads.router)
api_router.include_router(songs.router)
api_router.include_router(jobs.router)
api_router.include_router(lyrics.router)
api_router.include_router(playlists.router)
api_router.include_router(music.router)
