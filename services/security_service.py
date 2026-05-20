"""
Security Service
Handles HMAC signature verification and authentication
"""

import hmac
import hashlib
import logging
from datetime import datetime
from typing import Optional, Tuple

from passlib.context import CryptContext
from sqlalchemy.orm import Session

from models import SmartBin, BinStatus, AuditLog
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt", "pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Verify a plain password against a stored hash."""
    return pwd_context.verify(plain_password, password_hash)


def verify_esp32_signature(
    bin_code: str,
    timestamp: str,
    signature: str,
    body: bytes,
    db: Session,
    request_ip: Optional[str] = None
) -> Tuple[bool, Optional[SmartBin], str]:
    """
    Verify HMAC-SHA256 signature from ESP32 hardware.

    Authentication Flow:
    1. Validate timestamp (prevent replay attacks)
    2. Fetch bin's hardware API key from database
    3. Compute expected HMAC signature
    4. Compare with received signature (timing-safe)
    5. Log audit event

    Args:
        bin_code: Bin identifier (e.g., "BIN_001")
        timestamp: Unix timestamp from request header
        signature: HMAC signature from request header
        body: Request body bytes
        db: Database session
        request_ip: Client IP address for logging

    Returns:
        Tuple[bool, Optional[SmartBin], str]:
            - is_valid: True if signature valid
            - bin: SmartBin object if found
            - error_message: Error description if invalid
    """
    try:
        # Step 1: Validate timestamp (prevent replay attacks)
        try:
            request_time = datetime.fromtimestamp(int(timestamp))
        except (ValueError, OverflowError):
            logger.warning(f"Invalid timestamp format: {timestamp}")
            log_audit_event(db, "invalid_timestamp", bin_code, request_ip, signature)
            return False, None, "Invalid timestamp format"

        now = datetime.utcnow()
        time_diff = abs((now - request_time).total_seconds())

        if time_diff > settings.SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS:
            logger.warning(
                f"Timestamp outside tolerance window: {time_diff}s "
                f"(max: {settings.SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS}s)"
            )
            log_audit_event(db, "timestamp_expired", bin_code, request_ip, signature)
            return False, None, f"Timestamp outside valid window ({time_diff}s > {settings.SIGNATURE_TIMESTAMP_TOLERANCE_SECONDS}s)"

        # Step 2: Fetch bin from database
        bin = db.query(SmartBin).filter(SmartBin.bin_code == bin_code).first()

        if not bin:
            logger.warning(f"Bin not found: {bin_code}")
            log_audit_event(db, "bin_not_found", bin_code, request_ip, signature)
            return False, None, "Bin not found"

        if bin.status != BinStatus.ACTIVE:
            logger.warning(f"Bin not active: {bin_code} (status: {bin.status})")
            log_audit_event(db, "bin_inactive", bin_code, request_ip, signature, bin.id)
            return False, None, f"Bin is {bin.status}, not active"

        # Step 3: Compute expected HMAC signature
        # Message format: bin_code + timestamp + request_body
        message = f"{bin_code}{timestamp}{body.decode('utf-8')}"
        expected_signature = hmac.new(
            bin.hardware_api_key.encode('utf-8'),
            message.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        # Step 4: Timing-safe comparison (prevents timing attacks)
        is_valid = hmac.compare_digest(signature, expected_signature)

        if not is_valid:
            logger.warning(f"Invalid signature for bin {bin_code}")
            log_audit_event(db, "invalid_signature", bin_code, request_ip, signature, bin.id)
            return False, bin, "Invalid HMAC signature"

        # Step 5: Log successful authentication
        logger.info(f"Signature verified for bin {bin_code}")
        log_audit_event(db, "signature_valid", bin_code, request_ip, signature, bin.id)

        # Update bin's last_seen_at timestamp
        bin.last_seen_at = datetime.utcnow()
        db.commit()

        return True, bin, ""

    except Exception as e:
        logger.error(f"Error verifying signature: {e}")
        log_audit_event(db, "verification_error", bin_code, request_ip, signature)
        return False, None, f"Verification error: {str(e)}"


def log_audit_event(
    db: Session,
    event_type: str,
    bin_code: str,
    ip_address: Optional[str],
    signature: str,
    bin_id: Optional[int] = None,
    details: Optional[str] = None
):
    """
    Log security event to audit_logs table.

    Args:
        db: Database session
        event_type: Event type (e.g., "invalid_signature", "signature_valid")
        bin_code: Bin identifier
        ip_address: Client IP address
        signature: HMAC signature received
        bin_id: SmartBin ID if found
        details: Additional details (JSON string)
    """
    try:
        audit_log = AuditLog(
            event_type=event_type,
            entity_type="bin",
            entity_id=bin_id,
            ip_address=ip_address,
            bin_id=bin_id,
            request_signature=signature[:100],  # Truncate to 100 chars
            details=details or f"Bin: {bin_code}"
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")
        db.rollback()


def generate_hardware_api_key() -> Tuple[str, str]:
    """
    Generate a new hardware API key for a smart bin.

    Returns:
        Tuple[str, str]: (api_key, api_key_hash)
            - api_key: Raw key to give to ESP32 (ONE TIME ONLY)
            - api_key_hash: Hashed version to store in database
    """
    import secrets

    # Generate 64-character hex string (32 bytes)
    api_key = secrets.token_hex(32)

    # Hash for database storage (not strictly necessary but good practice)
    api_key_hash = hashlib.sha256(api_key.encode('utf-8')).hexdigest()

    return api_key, api_key_hash
