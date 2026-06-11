"""
Celery tasks for Eco Mais.
"""

from database import SessionLocal
from celery_app import celery_app
from services.background_tasks import process_image_with_ai


@celery_app.task(name="services.celery_tasks.process_image_with_ai_task")
def process_image_with_ai_task(discard_id: int, image_path: str):
    """Queue the heavy AI processing on a Celery worker."""
    db = SessionLocal()
    try:
        process_image_with_ai(discard_id, image_path, db)
    finally:
        db.close()
