"""Install reward triggers and reconcile user balances with the ledger."""

from pathlib import Path
import sys

from sqlalchemy import text

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import engine, ensure_reward_balance_triggers


def main():
    ensure_reward_balance_triggers(reconcile=True)

    with engine.connect() as conn:
        triggers = conn.execute(text("""
            SELECT TRIGGER_NAME, EVENT_MANIPULATION
            FROM information_schema.TRIGGERS
            WHERE TRIGGER_SCHEMA = DATABASE()
              AND EVENT_OBJECT_TABLE = 'rewards'
            ORDER BY EVENT_MANIPULATION
        """)).all()
        balances = conn.execute(text("""
            SELECT
                users.id,
                users.email,
                users.total_points,
                COALESCE(SUM(rewards.points), 0) AS ledger_total
            FROM users
            LEFT JOIN rewards ON rewards.user_id = users.id
            GROUP BY users.id, users.email, users.total_points
            ORDER BY users.id
        """)).all()

    print("Triggers:", [tuple(row) for row in triggers])
    print("Balances:", [tuple(row) for row in balances])


if __name__ == "__main__":
    main()
