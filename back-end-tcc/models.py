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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    cpf = Column(String(11), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)

    total_points = Column(Integer, default=0, nullable=False)
    total_discards = Column(Integer, default=0, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    active_sessions = relationship("ActiveSession", back_populates="user", cascade="all, delete-orphan")
    discards = relationship("Discard", back_populates="user", cascade="all, delete-orphan")
    rewards = relationship("Reward", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, username={self.username}, points={self.total_points})>"


class SmartBin(Base):
    __tablename__ = "smart_bins"

    id = Column(Integer, primary_key=True, index=True)
    bin_code = Column(String(50), unique=True, nullable=False, index=True)  # Physical identifier

    hardware_api_key = Column(String(255), unique=True, nullable=False)
    api_key_hash = Column(String(255), nullable=False)

    location_name = Column(String(255), nullable=False)
    location_address = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    max_weight_kg = Column(Float, default=50.0, nullable=False)
    current_load_kg = Column(Float, default=0.0, nullable=False)

    status = Column(Enum(BinStatus), default=BinStatus.ACTIVE, nullable=False)
    firmware_version = Column(String(50), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    last_maintenance_at = Column(DateTime(timezone=True), nullable=True)

    active_sessions = relationship("ActiveSession", back_populates="bin", cascade="all, delete-orphan")
    discards = relationship("Discard", back_populates="bin", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SmartBin(id={self.id}, code={self.bin_code}, status={self.status})>"


class ActiveSession(Base):
    __tablename__ = "active_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_token = Column(String(255), unique=True, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False, index=True)

    started_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    status = Column(Enum(SessionStatus), default=SessionStatus.ACTIVE, nullable=False, index=True)

    qr_code_scanned = Column(Boolean, default=True, nullable=False)
    weight_validated = Column(Boolean, default=False, nullable=False)
    vision_validated = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="active_sessions")
    bin = relationship("SmartBin", back_populates="active_sessions")
    discards = relationship("Discard", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index('idx_active_sessions_lookup', 'user_id', 'bin_id', 'status'),
        Index('idx_session_expiry', 'status', 'expires_at'),
    )

    def is_expired(self) -> bool:
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        return self.status == SessionStatus.ACTIVE and not self.is_expired()

    def __repr__(self):
        return f"<ActiveSession(id={self.id}, user_id={self.user_id}, status={self.status})>"


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)  # e.g., "PET Plastic"
    category = Column(Enum(MaterialCategory), nullable=False, index=True)

    points_per_kg = Column(Float, nullable=False)
    min_weight_grams = Column(Integer, default=10, nullable=False)

    ai_class_name = Column(String(100), nullable=False)
    confidence_threshold = Column(Float, default=0.7, nullable=False)

    is_recyclable = Column(Boolean, default=True, nullable=False)
    description = Column(Text, nullable=True)
    handling_instructions = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    discards = relationship("Discard", back_populates="material")

    def __repr__(self):
        return f"<Material(id={self.id}, name={self.name}, category={self.category})>"


class Discard(Base):
    __tablename__ = "discards"

    id = Column(Integer, primary_key=True, index=True)

    session_id = Column(Integer, ForeignKey("active_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="CASCADE"), nullable=False, index=True)
    material_id = Column(Integer, ForeignKey("materials.id", ondelete="SET NULL"), nullable=True, index=True)

    weight_grams = Column(Float, nullable=False)
    weight_validated = Column(Boolean, default=False, nullable=False)

    image_path = Column(String(500), nullable=True)
    ai_classification = Column(String(100), nullable=True)
    ai_confidence = Column(Float, nullable=True)
    vision_validated = Column(Boolean, default=False, nullable=False)

    session_validated = Column(Boolean, default=False, nullable=False)

    is_validated = Column(Boolean, default=False, nullable=False)
    validation_errors = Column(Text, nullable=True)

    points_awarded = Column(Integer, default=0, nullable=False)
    points_applied = Column(Boolean, default=False, nullable=False)

    flagged_as_suspicious = Column(Boolean, default=False, nullable=False)
    admin_reviewed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    validated_at = Column(DateTime(timezone=True), nullable=True)

    session = relationship("ActiveSession", back_populates="discards")
    user = relationship("User", back_populates="discards")
    bin = relationship("SmartBin", back_populates="discards")
    material = relationship("Material", back_populates="discards")

    __table_args__ = (
        Index('idx_discard_validation', 'is_validated', 'created_at'),
        Index('idx_discard_user_date', 'user_id', 'created_at'),
        Index('idx_discard_bin_date', 'bin_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Discard(id={self.id}, user_id={self.user_id}, weight={self.weight_grams}g, validated={self.is_validated})>"


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    points = Column(Integer, nullable=False)
    transaction_type = Column(String(50), nullable=False)

    discard_id = Column(Integer, ForeignKey("discards.id", ondelete="SET NULL"), nullable=True)

    description = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="rewards")

    __table_args__ = (
        Index('idx_rewards_user_date', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<Reward(id={self.id}, user_id={self.user_id}, points={self.points})>"


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    event_type = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(Integer, nullable=True)

    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    bin_id = Column(Integer, ForeignKey("smart_bins.id", ondelete="SET NULL"), nullable=True)

    request_signature = Column(String(500), nullable=True)

    details = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    __table_args__ = (
        Index('idx_audit_type_date', 'event_type', 'created_at'),
        Index('idx_audit_bin_date', 'bin_id', 'created_at'),
    )

    def __repr__(self):
        return f"<AuditLog(id={self.id}, event={self.event_type}, created_at={self.created_at})>"
