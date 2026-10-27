from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from .core.config import settings
from .db import init_db
from .routers import router as api_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    if not settings.jwt_secret_key:
        raise RuntimeError("JWT_SECRET_KEY is not set. Add it to mamacare-backend/.env.")
    init_db()
    yield


app = FastAPI(
    title="MamaCare Backend",
    description="FastAPI backend for the MamaCare dashboard, exposing AI assistance via Groq LLM.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

backend_root = Path(__file__).resolve().parent.parent
workspace_root = backend_root.parent
frontend_path = Path(settings.frontend_dist or backend_root / "mamacare-frontend" / "dist")
if not frontend_path.exists():
    fallback_path = backend_root / "mamacare-frontend"
    if fallback_path.exists():
        frontend_path = fallback_path
    else:
        alt_path = workspace_root / "mamacare-frontend" / "dist"
        if alt_path.exists():
            frontend_path = alt_path
        else:
            alt_fallback = workspace_root / "mamacare-frontend"
            if alt_fallback.exists():
                frontend_path = alt_fallback

if frontend_path.exists():
    app.mount("/", StaticFiles(directory=str(frontend_path), html=True), name="frontend")
