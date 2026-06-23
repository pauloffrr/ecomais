"""
Application configuration using Pydantic Settings
Reads from environment variables or .env file
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )

    APP_NAME: str = "Eco Mais Smart Recycling"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"  # development, staging, production

    API_V1_PREFIX: str = "/v1"
    ALLOWED_HOSTS: list[str] = ["*"]

    DB_USER: str = "root"
    DB_PASSWORD: str = ""
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_NAME: str = "eco_mais_db"

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    @property
    def database_url(self) -> str:
        """Build database connection URL"""
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            "?charset=utf8mb4"
        )

    SECRET_KEY: str = "your-super-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    MIN_PASSWORD_LENGTH: int = 8
    REQUIRE_UPPERCASE: bool = True
    REQUIRE_NUMBERS: bool = True
    REQUIRE_SPECIAL_CHARS: bool = True

    RATE_LIMIT_PER_MINUTE: int = 60
    RATE_LIMIT_PER_HOUR: int = 1000

    SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS: int = 300  # 5 minutes
    ENABLE_SIGNATURE_VERIFICATION: bool = True

    HARDWARE_API_KEY_LENGTH: int = 64
    HARDWARE_API_KEY_ROTATION_DAYS: int = 90

    SESSION_TIMEOUT_MINUTES: int = 3
    SESSION_CLEANUP_INTERVAL_SECONDS: int = 30
    MAX_ACTIVE_SESSIONS_PER_USER: int = 1

    MIN_WEIGHT_GRAMS: float = 10.0
    MAX_WEIGHT_GRAMS: float = 10000.0  # 10kg max per item
    WEIGHT_ANOMALY_THRESHOLD: float = 2.5

    MIN_AI_CONFIDENCE: float = 0.70
    MANUAL_REVIEW_CONFIDENCE_THRESHOLD: float = 0.75
    AUTO_ACCEPT_CONFIDENCE_THRESHOLD: float = 0.90

    MAX_DISCARDS_PER_SESSION: int = 10
    MAX_DISCARDS_PER_DAY: int = 100
    DUPLICATE_IMAGE_WINDOW_HOURS: int = 24
    SUSPICIOUS_DUPLICATE_PERCENTAGE: float = 0.50

    STORAGE_BACKEND: str = "local"

    LOCAL_STORAGE_PATH: str = "./uploads/images"
    IMAGE_RETENTION_DAYS: int = 90

    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = None
    AWS_S3_REGION: str = "us-east-1"

    MAX_IMAGE_SIZE_MB: int = 5
    ALLOWED_IMAGE_FORMATS: list[str] = ["jpg", "jpeg", "png"]
    IMAGE_COMPRESSION_QUALITY: int = 85

    AI_MODEL_PATH: str = "./ml/models/recyclable_classifier.pt"
    AI_MODEL_TYPE: str = "yolov8"  # yolov8, onnx (for production optimization)
    USE_GPU: bool = False
    BATCH_SIZE: int = 1

    MATERIAL_CLASSES: list[str] = [
        "plastic_pet",
        "plastic_hdpe",
        "glass_clear",
        "glass_colored",
        "paper_cardboard",
        "paper_newspaper",
        "metal_aluminum",
        "metal_steel",
        "organic",
        "electronic",
        "non_recyclable"
    ]

    DEFAULT_POINTS_PER_KG: float = 100.0
    BONUS_MULTIPLIER_WEEKENDS: float = 1.5
    FIRST_TIME_BONUS_POINTS: int = 50

    LEADERBOARD_CACHE_MINUTES: int = 15
    TOP_USERS_COUNT: int = 100

    CLEANUP_EXPIRED_SESSIONS_INTERVAL: int = 60  # seconds (check on each relevant request)
    CLEANUP_OLD_IMAGES_INTERVAL: int = 86400     # 24 hours

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    ENABLE_CELERY_TASKS: bool = False
    CELERY_TASK_ALWAYS_EAGER: bool = False
    CELERY_TASK_EAGER_PROPAGATES: bool = True

    @property
    def redis_url(self) -> str:
        """Build Redis connection URL."""
        auth = f":{self.REDIS_PASSWORD}@" if self.REDIS_PASSWORD else ""
        return f"redis://{auth}{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"

    @property
    def celery_broker_url(self) -> str:
        """Celery broker URL backed by Redis."""
        return self.redis_url

    @property
    def celery_result_backend(self) -> str:
        """Celery result backend backed by Redis."""
        return self.redis_url

    CACHE_TTL_SECONDS: int = 300  # 5 minutes

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # React dev server
        "http://localhost:8080",  # Vue dev server
        "http://localhost:8081",  # Expo Web
        "https://app.ecomais.com"  # Production frontend
    ]
    CORS_ORIGIN_REGEX: Optional[str] = (
        r"^https?://("
        r"localhost|127\.0\.0\.1|"
        r"10(?:\.\d{1,3}){3}|"
        r"192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}"
        r")(?::\d+)?$"
    )
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list[str] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    CORS_ALLOW_HEADERS: list[str] = ["*"]

    LOG_LEVEL: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    LOG_FORMAT: str = "json"  # json or text
    LOG_FILE: Optional[str] = "./logs/app.log"

    SENTRY_DSN: Optional[str] = None
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1

    ENABLE_HEALTH_CHECK: bool = True
    HEALTH_CHECK_PATH: str = "/health"

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@ecomais.com"

    ENABLE_AI_CLASSIFICATION: bool = True
    ENABLE_DUPLICATE_DETECTION: bool = True
    ENABLE_FRAUD_DETECTION: bool = True
    ENABLE_EMAIL_NOTIFICATIONS: bool = False
    ENABLE_PUSH_NOTIFICATIONS: bool = False

    ADMIN_EMAIL: str = "admin@ecomais.com"
    ADMIN_PANEL_ENABLED: bool = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


if __name__ == "__main__":
    settings = get_settings()

    print("=== Eco Mais Configuration ===")
    print(f"App Name: {settings.APP_NAME}")
    print(f"Version: {settings.APP_VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"Debug Mode: {settings.DEBUG}")
    print(f"\nDatabase: {settings.DATABASE_URL}")
    print(f"\nSession Timeout: {settings.SESSION_TIMEOUT_MINUTES} minutes")
    print(f"Min AI Confidence: {settings.MIN_AI_CONFIDENCE}")
    print(f"Max Discards/Session: {settings.MAX_DISCARDS_PER_SESSION}")
