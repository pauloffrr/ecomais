import os
import sys
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

os.environ["DEBUG"] = "false"

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

import uvicorn
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from api.v1.endpoints import auth, materials
from database import get_db
from models import Base


DATABASE_PATH = Path(tempfile.gettempdir()) / "ecomais_playwright_materials.db"
engine = create_engine(
    f"sqlite:///{DATABASE_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)


def override_get_db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@asynccontextmanager
async def lifespan(app):
    if DATABASE_PATH.exists():
        DATABASE_PATH.unlink()
    Base.metadata.create_all(engine)
    try:
        yield
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()
        if DATABASE_PATH.exists():
            DATABASE_PATH.unlink()


app = FastAPI(title="Eco Mais Playwright Test API", lifespan=lifespan)
app.dependency_overrides[get_db] = override_get_db
app.include_router(auth.router, prefix="/v1/auth", tags=["Authentication"])
app.include_router(materials.router, prefix="/v1/materials", tags=["Materials"])


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    port = int(os.getenv("PLAYWRIGHT_API_PORT", "8011"))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")
