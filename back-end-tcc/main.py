"""
Eco Mais Smart Recycling Bin - FastAPI Application
Main entry point for the backend API
"""

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import get_settings
from database import check_db_connection, ensure_reward_balance_triggers
from api.v1.endpoints import admin, auth, discards, materials, rewards, sessions, upload, users

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    if not check_db_connection():
        logger.error("Database connection failed! Please check your configuration.")
    else:
        ensure_reward_balance_triggers()
        logger.info("Database connection successful")

    yield

    logger.info("Shutting down application...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Recycling Bin API with Triple Validation (Session + Weight + AI Vision)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=(
        settings.CORS_ORIGIN_REGEX
        if settings.ENVIRONMENT.lower() == "development"
        else None
    ),
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

uploads_dir = Path(settings.LOCAL_STORAGE_PATH)
if not uploads_dir.is_absolute():
    uploads_dir = Path(__file__).resolve().parent / uploads_dir
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/images", StaticFiles(directory=str(uploads_dir)), name="upload-images")

@app.get("/health")
async def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected" if db_ok else "disconnected"
    }


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


app.include_router(
    auth.router,
    prefix="/v1/auth",
    tags=["Authentication"]
)

app.include_router(
    users.router,
    prefix="/v1/users",
    tags=["Users"]
)

app.include_router(
    materials.router,
    prefix="/v1/materials",
    tags=["Materials"]
)

app.include_router(
    sessions.router,
    prefix="/v1/sessions",
    tags=["Sessions"]
)

app.include_router(
    discards.router,
    prefix="/v1/discards",
    tags=["Discards"]
)

app.include_router(
    rewards.router,
    prefix="/v1/rewards",
    tags=["Gamification & Rewards"]
)

app.include_router(
    admin.router,
    prefix="/v1/admin",
    tags=["Admin Panel"]
)

app.include_router(
    upload.router,
    prefix="/v1/bin",
    tags=["ESP32 Hardware"]
)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
