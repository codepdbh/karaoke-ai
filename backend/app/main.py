from __future__ import annotations

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.router import api_router
from backend.app.api.ws import router as ws_router
from backend.app.core.config import get_settings, validate_model_layout
from backend.app.core.logging import configure_logging, get_logger

configure_logging()
settings = get_settings()
logger = get_logger(__name__)

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"message": "Validation error", "errors": exc.errors()},
    )


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("Starting %s in %s", settings.app_name, settings.app_env)
    model_state = validate_model_layout(settings)
    missing = [name for name, ready in model_state.items() if not ready]
    if missing:
        logger.warning("Missing model directories: %s", ", ".join(missing))


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "environment": settings.app_env,
        "models": validate_model_layout(settings),
    }


app.include_router(api_router)
app.include_router(ws_router)

