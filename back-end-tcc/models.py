from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy import (
    Boolean, Column, Integer, String, Float, DateTime,
    ForeignKey, Enum, Text, Index, UniqueConstraint
)
from sqlalchemy.orm import relationship, declarative_base
from sqlalchemy.sql import func
import enum

Base = declarative_base()


# Enums for status fields
class BinStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ERROR = "error"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class MaterialCategory(str, enum.Enum):
    PLASTIC = "plastic"
    GLASS = "glass"
    PAPER = "paper"
    METAL = "metal"
    ORGANIC = "organic"
    ELECTRONIC = "electronic"
    MIXED = "mixed"
    NON_RECYCLABLE = "non_recyclable"


# ==================== USERS ====================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    cpf = Column(String(11), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    # Gamification & Rewards
    total_points = Column(Integer, default=0, nullable=False)
    total_discards = Column(Integer, default=0, nullable=False)

    # Account status
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    active_sessions = relationship("ActiveSession", back_populates="user", cascade="all, delete-orphan")
    discards = relationship("Discard", back_populates="user", cascade="all, delete-orphan")
    rewards = relationship("Reward", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, points={self.total_points})>"


# ==================== SMART BINS ====================
class SmartBin(Base):
    __tablename__ = "smart_bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(50), unique=True, nullable=False, index=True)  # Physical identifier

    # Security
    hardware_api_key = Column(String(255), unique=True, nullable=False)  # For ESP32 authentication
    api_key_hash = Column(String(255), nullable=False)  # Hashed version for validation

    # Location & Info
    location_name = Column(String(255), nullable=False)
    location_address = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Hardware specs
    max_weight_kg = Column(Float, default=50.0, nullable=False)
    current_load_kg = Column(Float, default=0.0, nullable=False)

    # Status
    status = Column(Enum(BinStatus), default=BinStatus.ACTIVE, nullable=False)
    firmware_version = Column(String(50), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_maintenance_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    active_sessions = relationship("ActiveSession", back_populates="bin", cascade="all, delete-orphan")
    discards = relationship("Discard", back_populates="bin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SmartBin(id={self.id}, code={self.bin_code}, status={self.status})>"


# ==================== ACTIVE SESSIONS (3-MIN TIMEOUT) ====================
class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)

    # Foreign Keys
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False, index=True)

    # Session timing (3-minute window)
    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False, index=True)

    # Session metadata
    qr_code_scanned = Column(Boolean, default=True, nullable=False)
    weight_validated = Column(Boolean, default=False, nullable=False)
    vision_validated = Column(Boolean, default=False, nullable=False)

    # Relationships
    user = relationship("User", back_populates="active_sessions")
    bin = relationship("SmartBin", back_populates="active_sessions")
    discards = relationship("Discard", back_populates="session", cascade="all, delete-orphan")

    # Composite index for performance
    __table_args__ = (
        Index('idx_active_sessions_lookup', 'user_id', 'bin_id', 'status'),
        Index('idx_session_expiry', 'status', 'expires_at'),
    )

    def is_expired(self) -> bool:
        """Check if session has expired (3-minute timeout)"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Check if session is still active and not expired"""
        return self.status == SessionStatus.ACTIVE and not self.is_expired()

    def __repr__(self):
        return f"<ActiveSession(id={self.id}, user_id={self.user_id}, status={self.status})>"


# ==================== MATERIALS ====================
class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "PET Plastic"
    category = Column(Enum(MaterialCategory), nullable=False, index=True)

    # Rewards calculation
    points_per_kg = Column(Float, nullable=False)  # Points awarded per kilogram
    min_weight_grams = Column(Integer, default=10, nullable=False)  # Minimum weight to accept

    # AI Classification
    ai_class_name = Column(String(100), nullable=False)  # Expected class from AI model
    confidence_threshold = Column(Float, default=0.7, nullable=False)  # Min confidence to accept

    # Material properties
    is_recyclable = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    handling_instructions = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    # Relationships
    discards = relationship("Discard", back_populates="material")

    def __repr__(self):
        return f"<Material(id={self.id}, name={self.name}, category={self.category})>"


# ==================== DISCARDS (Triple Validation) ====================
class Discard(Base):
    __tablename__ = "discards"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign Keys
    session_id = Column(Integer, ForeignKey("active_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="SET NULL"), nullable=True, index=True)

    # === TRIPLE VALIDATION ===
    # 1. Weight validation (from load cell)
    weight_grams = Column(Float, nullable=False)
    weight_validated = Column(Boolean, default=False, nullable=False)

    # 2. Vision AI validation (from ESP32-CAM)
    image_path = Column(String(500), nullable=True)  # S3/local storage path
    ai_classification = Column(String(100), nullable=True)  # What AI detected
    ai_confidence = Column(Float, nullable=True)  # 0.0 - 1.0
    vision_validated = Column(Boolean, default=False, nullable=False)

    # 3. Session validation (user + timeout)
    session_validated = Column(Boolean, default=False, nullable=False)

    # Overall validation status
    is_validated = Column(Boolean, default=False, nullable=False)  # All 3 validations passed
    validation_errors = Column(Text, nullable=True)  # JSON array of validation issues

    # Rewards
    points_awarded = Column(Integer, default=0, nullable=False)
    points_applied = Column(Boolean, default=False, nullable=False)

    # Fraud prevention
    flagged_as_suspicious = Column(Boolean, default=False, nullable=False)
    admin_reviewed = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    session = relationship("ActiveSession", back_populates="discards")
    user = relationship("User", back_populates="discards")
    bin = relationship("SmartBin", back_populates="discards")
    material = relationship("Material", back_populates="discards")

    # Composite indexes for analytics
    __table_args__ = (
        Index('idx_discard_validation', 'is_validated', 'created_at'),
        Index('idx_discard_user_date', 'user_id', 'created_at'),
        Index('idx_discard_bin_date', 'bin_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Discard(id={self.id}, user_id={self.user_id}, weight={self.weight_grams}g, validated={self.is_validated})>"


# ==================== REWARDS ====================
class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Points transaction
    points = Column(Integer, nullable=False)  # Can be positive (earn) or negative (redeem)
    transaction_type = Column(String(50), nullable=False)  # "discard", "bonus", "redemption"

    # Related entities
    discard_id = Column(Integer, ForeignKey("discards.id", ondelete="SET NULL"), nullable=True)

    # Description
    description = Column(String(500), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="rewards")

    __table_args__ = (
        Index('idx_rewards_user_date', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Reward(id={self.id}, user_id={self.user_id}, points={self.points})>"


# ==================== AUDIT LOG (Security & Compliance) ====================
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Event details
    event_type = Column(String(100), nullable=False, index=True)  # "bin_request", "session_start", etc.
    entity_type = Column(String(50), nullable=True)  # "user", "bin", "session"
    entity_id = Column(Integer, nullable=True)

    # Request details
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(String(500), nullable=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="SET NULL"), nullable=True)

    # Security
    request_signature = Column(String(500), nullable=True)  # HMAC signature from ESP32

    # Metadata
    details = Column(Text, nullable=True)  # JSON field for additional context

    # Timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index('idx_audit_type_date', 'event_type', 'created_at'),
        Index('idx_audit_bin_date', 'bin_id', 'created_at'),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, event={self.event_type}, created_at={self.created_at})>"
