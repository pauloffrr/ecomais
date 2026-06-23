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


class DatabaseConfig:
    DB_USER = "root"
    DB_PASSWORD = ""
    DB_HOST = "127.0.0.1"
    DB_PORT = 3306
    DB_NAME = "eco_mais_db"

    POOL_SIZE = 10
    MAX_OVERFLOW = 20
    POOL_TIMEOUT = 30
    POOL_RECYCLE = 3600

    CHARSET = "utf8mb4"
    COLLATION = "utf8mb4_unicode_ci"

    @classmethod
    def get_database_url(cls) -> str:
        return (
            f"mysql+pymysql://{cls.DB_USER}:{cls.DB_PASSWORD}"
            f"@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"
            f"?charset={cls.CHARSET}"
        )


engine = create_engine(
    DatabaseConfig.get_database_url(),
    poolclass=QueuePool,
    pool_size=DatabaseConfig.POOL_SIZE,
    max_overflow=DatabaseConfig.MAX_OVERFLOW,
    pool_timeout=DatabaseConfig.POOL_TIMEOUT,
    pool_recycle=DatabaseConfig.POOL_RECYCLE,
    pool_pre_ping=True,  # Verify connections before using (prevent "MySQL has gone away")
    echo=False,
    future=True,
)


@event.listens_for(engine, "connect")
def set_mariadb_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()

    cursor.execute("SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED")
    cursor.execute("SET time_zone = '+00:00'")
    cursor.execute("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO'")

    cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        _ensure_user_cpf_column()
        _ensure_user_admin_column()
        ensure_reward_balance_triggers()
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


def ensure_reward_balance_triggers(target_engine=engine, reconcile: bool = False):
    """Keep users.total_points synchronized with the rewards ledger."""
    inspector = inspect(target_engine)
    tables = set(inspector.get_table_names())
    if not {"users", "rewards"}.issubset(tables):
        return

    dialect = target_engine.dialect.name
    trigger_names = (
        "trg_rewards_points_after_insert",
        "trg_rewards_points_after_update",
        "trg_rewards_points_after_delete",
    )

    with target_engine.begin() as conn:
        for trigger_name in trigger_names:
            conn.execute(text(f"DROP TRIGGER IF EXISTS {trigger_name}"))

        if dialect == "sqlite":
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_insert
                AFTER INSERT ON rewards
                FOR EACH ROW
                BEGIN
                    UPDATE users
                    SET total_points = total_points + NEW.points
                    WHERE id = NEW.user_id;
                END
            """))
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_update
                AFTER UPDATE OF user_id, points ON rewards
                FOR EACH ROW
                BEGIN
                    UPDATE users
                    SET total_points = total_points - OLD.points
                    WHERE id = OLD.user_id;
                    UPDATE users
                    SET total_points = total_points + NEW.points
                    WHERE id = NEW.user_id;
                END
            """))
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_delete
                AFTER DELETE ON rewards
                FOR EACH ROW
                BEGIN
                    UPDATE users
                    SET total_points = total_points - OLD.points
                    WHERE id = OLD.user_id;
                END
            """))
        else:
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_insert
                AFTER INSERT ON rewards
                FOR EACH ROW
                UPDATE users
                SET total_points = total_points + NEW.points
                WHERE id = NEW.user_id
            """))
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_update
                AFTER UPDATE ON rewards
                FOR EACH ROW
                BEGIN
                    UPDATE users
                    SET total_points = total_points - OLD.points
                    WHERE id = OLD.user_id;
                    UPDATE users
                    SET total_points = total_points + NEW.points
                    WHERE id = NEW.user_id;
                END
            """))
            conn.execute(text("""
                CREATE TRIGGER trg_rewards_points_after_delete
                AFTER DELETE ON rewards
                FOR EACH ROW
                UPDATE users
                SET total_points = total_points - OLD.points
                WHERE id = OLD.user_id
            """))

        if reconcile:
            conn.execute(text("""
                UPDATE users
                SET total_points = COALESCE(
                    (SELECT SUM(rewards.points)
                     FROM rewards
                     WHERE rewards.user_id = users.id),
                    0
                )
            """))

    logger.info("Reward balance triggers installed%s", " and balances reconciled" if reconcile else "")


def check_db_connection() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            conn.commit()
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return False


def atomic_update(db: Session, callback):
    try:
        callback(db)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        logger.error(f"Transaction failed: {e}")
        raise


def update_with_retry(db: Session, callback, max_retries: int = 3):
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


if __name__ == "__main__":
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
