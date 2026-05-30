"""
Database configuration and session management for Smart Recycling Bin
Uses SQLAlchemy with MariaDB (MySQL driver)
"""

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import QueuePool
from typing import Generator
import logging

from models import Base

logger = logging.getLogger(__name__)


# ==================== DATABASE CONFIGURATION ====================

class DatabaseConfig:
    """Database configuration for MariaDB"""

    # Connection settings (replace with environment variables in production)
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_HOST = "127.0.0.1"
    DB_PORT = 3306
    DB_NAME = "eco_mais_db"

    # Connection pool settings
    POOL_SIZE = 10                    # Number of permanent connections
    MAX_OVERFLOW = 20                 # Additional connections when pool exhausted
    POOL_TIMEOUT = 30                 # Seconds to wait for available connection
    POOL_RECYCLE = 3600               # Recycle connections after 1 hour (prevents stale connections)

    # MariaDB specific settings
    CHARSET = "utf8mb4"                # Full Unicode support (emojis, etc.)
    COLLATION = "utf8mb4_unicode_ci"  # Case-insensitive Unicode collation

    @classmethod
    def get_database_url(cls) -> str:
        """Build MariaDB connection URL"""
        # Use pymysql driver (pure Python) or mysqlclient (faster, C-based)
        return (
            f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
            f"?charset={cls.CHARSET}"
        )


# ==================== ENGINE CREATION ====================

engine = create_engine(
    DatabaseConfig.get_database_url(),
    poolclass=QueuePool,
    pool_size=DatabaseConfig.POOL_SIZE,
    max_overflow=DatabaseConfig.MAX_OVERFLOW,
    pool_timeout=DatabaseConfig.POOL_TIMEOUT,
    pool_recycle=DatabaseConfig.POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before using (prevent "MySQL has gone away")
    echo=False,          # Set to True for SQL query logging (development only)
    future=True,         # Use SQLAlchemy 2.0 style
)


# Set MariaDB session variables for optimal performance
@event.listens_for(engine, "connect")
def set_mariadb_pragma(dbapi_conn, connection_record):
    """Configure MariaDB session settings on each connection"""
    cursor = dbapi_conn.cursor()

    # Set transaction isolation level for consistency
    cursor.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED")

    # Set timezone to UTC (critical for timestamp consistency)
    cursor.execute("SET time_zone = '+00:00'")

    # Optimize for InnoDB (MariaDB's default engine)
    cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO'")

    cursor.close()


# ==================== SESSION MANAGEMENT ====================

# SessionLocal class for creating database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False  # Prevent lazy-loading errors after commit
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency for database sessions.

    Usage in route:
        @app.get("/users")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables.
    WARNING: Only use in development. Use Alembic migrations in production.
    """
    try:
        # Create all tables defined in models.py
        Base.metadata.create_all(bind=engine)
        _ensure_user_cpf_column()
        _ensure_user_admin_column()
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        raise


def _ensure_user_admin_column():
    """Add users.is_admin if the database was created before the admin flag existed."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "is_admin" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE"))
    logger.info("Added missing users.is_admin column")


def _ensure_user_cpf_column():
    """Add users.cpf if the database was created before CPF became required."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("users")}
    if "cpf" in columns:
        return

    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN cpf VARCHAR(11) NULL"))
        conn.execute(text("UPDATE users SET cpf = LPAD(id, 11, '0') WHERE cpf IS NULL"))
        conn.execute(text("ALTER TABLE users MODIFY cpf VARCHAR(11) NOT NULL"))
        conn.execute(text("CREATE UNIQUE INDEX ix_users_cpf ON users (cpf)"))

    logger.info("Added missing users.cpf column")


def check_db_connection() -> bool:
    """
    Health check function to verify database connectivity.
    Returns True if connection successful, False otherwise.
    """
    try:
        with engine.connect() as conn:
            # Em 2026 (SQLAlchemy 2.x), o comando deve estar dentro de text()
            conn.execute(text("SELECT 1"))
            conn.commit() # Boa prática: sempre fechar a transação
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


# ==================== TRANSACTION HELPERS ====================

def atomic_update(db: Session, callback):
    """
    Execute a callback within an atomic transaction.
    Auto-rollback on error, commit on success.

    Example:
        def update_points(session):
            user = session.query(User).filter(User.id == 1).first()
            user.total_points += 100

        atomic_update(db, update_points)
    """
    try:
        callback(db)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed: {e}")
        raise


# ==================== OPTIMISTIC LOCKING ====================

def update_with_retry(db: Session, callback, max_retries: int = 3):
    """
    Retry logic for optimistic locking conflicts.
    Useful for high-concurrency updates (e.g., user points).

    Example:
        def increment_points(session):
            user = session.query(User).filter(User.id == 1).with_for_update().first()
            user.total_points += 100

        update_with_retry(db, increment_points)
    """
    retries = 0
    while retries < max_retries:
        try:
            callback(db)
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            retries += 1
            if retries >= max_retries:
                logger.error(f"Transaction failed after {max_retries} retries: {e}")
                raise
            logger.warning(f"Transaction retry {retries}/{max_retries}")


# ==================== USAGE EXAMPLE ====================

if __name__ == "__main__":
    """
    Test database connection and table creation
    """
    print("Testing database connection...")

    if check_db_connection():
        print("✓ Database connection successful")
    else:
        print("✗ Database connection failed")
        exit(1)

    print("\nInitializing database tables...")
    init_db()

    print("\nVerifying table creation...")
    with engine.connect() as conn:
        result = conn.execute("""
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = %s
        """, (DatabaseConfig.DB_NAME,))

        tables = [row[0] for row in result]
        print(f"Created tables: {', '.join(tables)}")

    print("\n✓ Database setup complete!")
