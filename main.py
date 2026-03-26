"""
Eco Mais Smart Recycling Bin - FastAPI Application
Main entry point for the backend API
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import check_db_connection
from api.v1.endpoints import upload

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


# ==================== STARTUP / SHUTDOWN ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Environment: {settings.ENVIRONMENT}")

    # Check database connection
    if not check_db_connection():
        logger.error("Database connection failed! Please check your configuration.")
    else:
        logger.info("Database connection successful")

    yield

    # Shutdown
    logger.info("Shutting down application...")


# ==================== APPLICATION ====================

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Smart Recycling Bin API with Triple Validation (Session + Weight + AI Vision)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# ==================== CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# ==================== ROUTES ====================

# Health check
@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Returns server status and database connectivity.
    """
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
    """
    Root endpoint with API information.
    """
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health"
    }


# Include routers
app.include_router(
    upload.router,
    prefix="/v1/bin",
    tags=["ESP32 Hardware"]
)

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
