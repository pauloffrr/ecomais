#!/usr/bin/env python3
"""
Quick setup script for Eco Mais Smart Recycling Bin
Initializes database, seeds materials, and creates test data
"""

import sys
import os
from datetime import datetime, timedelta
import secrets
import hashlib

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, init_db, check_db_connection, engine
from models import (
    User, SmartBin, BinStatus, Material, MaterialCategory,
    ActiveSession, SessionStatus, Discard, Reward, Base
)
from sqlalchemy.orm import Session
from services.auth_service import hash_password


def print_header(text: str):
    print(f"\n{'=' * 60}")
    print(f"  {text}")
    print('=' * 60)


def check_database_connection():
    print_header("Checking Database Connection")

    if check_db_connection():
        print("✓ Database connection successful")
        return True
    else:
        print("✗ Database connection failed")
        print("\nPlease ensure:")
        print("  1. MariaDB/MySQL is running")
        print("  2. Database 'eco_mais_db' exists")
        print("  3. User credentials in .env are correct")
        return False


def initialize_database():
    print_header("Initializing Database Tables")

    try:
        init_db()
        print("✓ Database tables created successfully")
        return True
    except Exception as e:
        print(f"✗ Failed to create tables: {e}")
        return False


def seed_materials(db: Session):
    print_header("Seeding Materials Data")

    existing_count = db.query(Material).count()
    if existing_count > 0:
        print(f"⚠ Materials already exist ({existing_count} records). Skipping...")
        return

    materials_data = [
        {
            "name": "PET Plastic Bottle",
            "category": MaterialCategory.PLASTIC,
            "points_per_kg": 120.0,
            "ai_class_name": "plastic_pet",
            "min_weight_grams": 10,
            "confidence_threshold": 0.75,
            "description": "Clear plastic bottles (water, soda, etc.)"
        },
        {
            "name": "HDPE Plastic Container",
            "category": MaterialCategory.PLASTIC,
            "points_per_kg": 100.0,
            "ai_class_name": "plastic_hdpe",
            "min_weight_grams": 15,
            "confidence_threshold": 0.70,
            "description": "Milk jugs, detergent bottles, shampoo containers"
        },
        {
            "name": "Clear Glass Bottle",
            "category": MaterialCategory.GLASS,
            "points_per_kg": 80.0,
            "ai_class_name": "glass_clear",
            "min_weight_grams": 50,
            "confidence_threshold": 0.80,
            "description": "Clear glass bottles and jars"
        },
        {
            "name": "Colored Glass Bottle",
            "category": MaterialCategory.GLASS,
            "points_per_kg": 75.0,
            "ai_class_name": "glass_colored",
            "min_weight_grams": 50,
            "confidence_threshold": 0.75,
            "description": "Green, brown, or blue glass bottles"
        },
        {
            "name": "Cardboard",
            "category": MaterialCategory.PAPER,
            "points_per_kg": 50.0,
            "ai_class_name": "paper_cardboard",
            "min_weight_grams": 20,
            "confidence_threshold": 0.65,
            "description": "Boxes, packaging materials"
        },
        {
            "name": "Newspaper & Paper",
            "category": MaterialCategory.PAPER,
            "points_per_kg": 40.0,
            "ai_class_name": "paper_newspaper",
            "min_weight_grams": 10,
            "confidence_threshold": 0.70,
            "description": "Newspapers, magazines, office paper"
        },
        {
            "name": "Aluminum Can",
            "category": MaterialCategory.METAL,
            "points_per_kg": 200.0,
            "ai_class_name": "metal_aluminum",
            "min_weight_grams": 15,
            "confidence_threshold": 0.85,
            "description": "Soda cans, beer cans"
        },
        {
            "name": "Steel Can",
            "category": MaterialCategory.METAL,
            "points_per_kg": 150.0,
            "ai_class_name": "metal_steel",
            "min_weight_grams": 30,
            "confidence_threshold": 0.75,
            "description": "Food cans, aerosol cans"
        },
        {
            "name": "Organic Waste",
            "category": MaterialCategory.ORGANIC,
            "points_per_kg": 30.0,
            "ai_class_name": "organic",
            "min_weight_grams": 20,
            "confidence_threshold": 0.60,
            "description": "Food scraps, yard waste"
        },
        {
            "name": "Electronic Waste",
            "category": MaterialCategory.ELECTRONIC,
            "points_per_kg": 300.0,
            "ai_class_name": "electronic",
            "min_weight_grams": 50,
            "confidence_threshold": 0.80,
            "description": "Batteries, small electronics, cables"
        },
    ]

    materials = [Material(**data) for data in materials_data]
    db.add_all(materials)
    db.commit()

    print(f"✓ Seeded {len(materials)} material types")


def create_test_user(db: Session):
    print_header("Creating Test User")

    existing = db.query(User).filter(User.email == "test@ecomais.com").first()
    if existing:
        print("⚠ Test user already exists. Skipping...")
        return existing

    password_hash = hash_password("password123")

    user = User(
        email="test@ecomais.com",
        username="testuser",
        cpf="39053344705",
        password_hash=password_hash,
        full_name="Test User",
        phone="+5511999999999",
        total_points=0,
        is_active=True,
        is_verified=True
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    print(f"✓ Created test user: {user.email}")
    print(f"  Username: testuser")
    print(f"  Password: password123")
    print(f"  User ID: {user.id}")

    return user


def create_test_bin(db: Session):
    print_header("Creating Test Smart Bin")

    existing = db.query(SmartBin).filter(SmartBin.bin_code == "BIN_TEST_001").first()
    if existing:
        print("⚠ Test bin already exists. Skipping...")
        return existing

    api_key = secrets.token_hex(32)
    api_key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    bin = SmartBin(
        bin_code="BIN_TEST_001",
        hardware_api_key=api_key,
        api_key_hash=api_key_hash,
        location_name="Test Location - Campus Central",
        location_address="Av. Paulista, 1000 - São Paulo, SP",
        latitude=-23.561684,
        longitude=-46.655981,
        max_weight_kg=50.0,
        current_load_kg=0.0,
        status=BinStatus.ACTIVE,
        firmware_version="1.0.0"
    )

    db.add(bin)
    db.commit()
    db.refresh(bin)

    print(f"✓ Created test smart bin: {bin.bin_code}")
    print(f"  Location: {bin.location_name}")
    print(f"  Hardware API Key: {api_key}")
    print(f"  Bin ID: {bin.id}")
    print(f"\n  ⚠ IMPORTANT: Save this API key for ESP32 configuration!")

    return bin


def create_test_session(db: Session, user: User, bin: SmartBin):
    print_header("Creating Test Session")

    session_token = secrets.token_urlsafe(32)

    session = ActiveSession(
        session_token=session_token,
        user_id=user.id,
        bin_id=bin.id,
        started_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(minutes=3),
        status=SessionStatus.ACTIVE,
        qr_code_scanned=True,
        weight_validated=False,
        vision_validated=False
    )

    db.add(session)
    db.commit()
    db.refresh(session)

    print(f"✓ Created test session: {session.id}")
    print(f"  Session Token: {session_token}")
    print(f"  Expires At: {session.expires_at}")

    return session


def display_summary():
    print_header("Setup Complete!")

    print("""
✅ Database initialized successfully!

Next Steps:
  1. Copy .env.example to .env and configure your settings
     $ cp .env.example .env

  2. Install Python dependencies
     $ pip install -r requirements.txt

  3. Run the FastAPI server (after implementing main.py)
     $ uvicorn main:app --reload

  4. Test the API
     $ curl http://localhost:8000/health

  5. Configure your ESP32-CAM with the hardware API key shown above

Resources:
  - Architecture Guide: ARCHITECTURE.md
  - System Diagrams: DIAGRAMS.md
  - Database Models: models.py
  - API Documentation: Will be at http://localhost:8000/docs

Test Credentials:
  - Email: test@ecomais.com
  - Password: password123
  - Bin Code: BIN_TEST_001

Happy coding! 🚀🌱
    """)


def main():
    print("""
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🌱 Eco Mais Smart Recycling Bin - Setup Script        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
    """)

    if not check_database_connection():
        print("\n❌ Setup failed. Fix database connection and try again.")
        sys.exit(1)

    if not initialize_database():
        print("\n❌ Setup failed. Could not create database tables.")
        sys.exit(1)

    db = SessionLocal()
    try:
        seed_materials(db)
        user = create_test_user(db)
        bin = create_test_bin(db)
        create_test_session(db, user, bin)
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

    display_summary()


if __name__ == "__main__":
    main()
