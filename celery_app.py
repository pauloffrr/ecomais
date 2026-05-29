"""
Celery application configuration for Eco Mais.
"""

from celery import Celery

from config import get_settings

settings = get_settings()

celery_app = Celery(
    "eco_mais",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["services.celery_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_always_eager=settings.CELERY_TASK_ALWAYS_EAGER,
    task_eager_propagates=settings.CELERY_TASK_EAGER_PROPAGATES,
)
