"""
Bin Endpoints - ESP32 Hardware API
Handles uploads from smart bins with triple validation
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request, Header
from sqlalchemy.orm import Session

from database import get_db
from api.v1.schemas.bin import (
    BinUploadRequest,
    BinUploadResponse,
    BinHeartbeatRequest,
    BinHeartbeatResponse
)
from services.security_service import verify_esp32_signature
from services.validation_service import (
    validate_session,
    validate_weight,
    check_rate_limits,
    create_discard_record,
    update_session_validation_status
)
from services.background_tasks import (
    save_image_to_disk,
    process_image_with_ai,
    cleanup_expired_sessions,
    check_duplicate_image
)
from config import get_settings

try:
    from services.celery_tasks import process_image_with_ai_task
except ImportError:
    process_image_with_ai_task = None

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# ==================== HELPER FUNCTIONS ====================

async def get_request_body(request: Request) -> bytes:
    """Get raw request body for HMAC verification"""
    return await request.body()


def require_esp32_auth(
    request: Request,
    x_bin_id: str = Header(..., alias="X-Bin-ID"),
    x_timestamp: str = Header(..., alias="X-Timestamp"),
    x_signature: str = Header(..., alias="X-Signature"),
    db: Session = Depends(get_db)
):
    """
    Dependency for ESP32 authentication via HMAC signature.

    Required Headers:
        X-Bin-ID: Bin identifier
        X-Timestamp: Unix timestamp
        X-Signature: HMAC-SHA256 signature

    Returns:
        SmartBin: Authenticated bin object

    Raises:
        HTTPException: If authentication fails
    """
    # Get request body for signature verification
    # Note: This is a simplification; in production, use request.body()
    # but be careful with async/await and body consumption

    # For now, we'll verify signature without body
    # In production, you'd need to handle body reading carefully

    logger.info(f"Authenticating bin: {x_bin_id}")

    # Verify signature (simplified - see note above about body)
    is_valid, bin, error_msg = verify_esp32_signature(
        bin_code=x_bin_id,
        timestamp=x_timestamp,
        signature=x_signature,
        body=b"{}",  # Placeholder - see production note below
        db=db,
        request_ip=request.client.host if request.client else None
    )

    if not is_valid:
        logger.warning(f"Authentication failed for bin {x_bin_id}: {error_msg}")
        raise HTTPException(status_code=401, detail=error_msg)

    return bin


# ==================== ENDPOINTS ====================

@router.post("/upload", response_model=BinUploadResponse)
async def upload_discard(
    data: BinUploadRequest,
    background_tasks: BackgroundTasks,
    request: Request,
    x_bin_id: str = Header(..., alias="X-Bin-ID"),
    x_timestamp: str = Header(..., alias="X-Timestamp"),
    x_signature: str = Header(..., alias="X-Signature"),
    db: Session = Depends(get_db)
):
    """
    **ESP32 Endpoint: Upload Discard with Triple Validation**

    Flow:
    1. Verify HMAC signature (hardware authentication)
    2. Validate active session (user context)
    3. Validate weight (realistic range)
    4. Check rate limits (fraud prevention)
    5. Save image to disk (synchronous)
    6. Return 200 OK immediately
    7. Process AI classification in background
    8. Award points if all validations pass

    Required Headers:
        - X-Bin-ID: Bin identifier (e.g., "BIN_001")
        - X-Timestamp: Unix timestamp
        - X-Signature: HMAC-SHA256(api_key, bin_id+timestamp+body)

    Returns:
        200 OK: Upload received, processing in background
        401 Unauthorized: HMAC signature invalid
        403 Forbidden: Session expired
        422 Unprocessable Entity: Validation failed
        429 Too Many Requests: Rate limit exceeded
    """
    try:
        # ===== STEP 1: VERIFY HMAC SIGNATURE (Hardware Authentication) =====
        logger.info(f"Received upload from bin {x_bin_id}")

        # Get request body for HMAC verification
        body = await request.body()

        is_valid, bin, error_msg = verify_esp32_signature(
            bin_code=x_bin_id,
            timestamp=x_timestamp,
            signature=x_signature,
            body=body,
            db=db,
            request_ip=request.client.host if request.client else None
        )

        if not is_valid or not bin:
            raise HTTPException(status_code=401, detail=error_msg or "Authentication failed")

        # ===== STEP 2: VALIDATE ACTIVE SESSION (User Context) =====
        is_valid, session, error_msg = validate_session(
            session_token=data.session_token,
            bin_id=bin.id,
            db=db
        )

        if not is_valid:
            # Cleanup expired sessions opportunistically
            background_tasks.add_task(cleanup_expired_sessions, db)
            raise HTTPException(status_code=403, detail=error_msg)

        # ===== STEP 3: VALIDATE WEIGHT =====
        is_valid, error_msg = validate_weight(
            weight_grams=data.weight_grams,
            user_id=session.user_id,
            db=db
        )

        if not is_valid:
            raise HTTPException(status_code=422, detail=error_msg)

        # ===== STEP 4: CHECK RATE LIMITS =====
        is_allowed, error_msg = check_rate_limits(
            user_id=session.user_id,
            session_id=session.id,
            db=db
        )

        if not is_allowed:
            raise HTTPException(status_code=429, detail=error_msg)

        # ===== STEP 5: SAVE IMAGE TO DISK (Synchronous) =====
        # Create a temporary discard record to get an ID for filename
        temp_discard = create_discard_record(
            session=session,
            bin=bin,
            weight_grams=data.weight_grams,
            image_path="",  # Will be updated after saving
            db=db
        )

        # Save image and update discard with path
        image_path = save_image_to_disk(data.image, temp_discard.id)
        temp_discard.image_path = image_path
        db.commit()

        # Check for duplicate images (optional, can be background task too)
        if settings.ENABLE_DUPLICATE_DETECTION:
            is_duplicate = check_duplicate_image(
                user_id=session.user_id,
                image_path=image_path,
                db=db
            )
            if is_duplicate:
                temp_discard.flagged_as_suspicious = True
                temp_discard.validation_errors = "Duplicate image detected"
                db.commit()
                logger.warning(f"Duplicate image detected for user {session.user_id}")

        # ===== STEP 6: RETURN 200 OK IMMEDIATELY =====
        logger.info(
            f"Upload accepted. Discard ID: {temp_discard.id}. "
            f"Starting background AI processing..."
        )

        # ===== STEP 7: SCHEDULE AI PROCESSING IN BACKGROUND =====
        # This runs AFTER the response is sent to ESP32
        celery_success = False
        if process_image_with_ai_task is not None:
            try:
                process_image_with_ai_task.delay(temp_discard.id, image_path)
                celery_success = True
            except Exception as e:
                logger.warning(f"Redis/Celery offline. Falling back to BackgroundTasks. Error: {e}")
                
        if not celery_success:
            background_tasks.add_task(
                process_image_with_ai,
                discard_id=temp_discard.id,
                image_path=image_path,
                db=db
            )

        # Update session validation checkpoints
        background_tasks.add_task(
            update_session_validation_status,
            session=session,
            weight_validated=True,
            vision_validated=False,  # Pending
            db=db
        )

        return BinUploadResponse(
            success=True,
            message="Upload received. Processing classification in background.",
            discard_id=temp_discard.id,
            processing_status="pending"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing upload: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/heartbeat", response_model=BinHeartbeatResponse)
async def bin_heartbeat(
    data: BinHeartbeatRequest,
    x_bin_id: str = Header(..., alias="X-Bin-ID"),
    x_timestamp: str = Header(..., alias="X-Timestamp"),
    x_signature: str = Header(..., alias="X-Signature"),
    db: Session = Depends(get_db),
    request: Request = None
):
    """
    **ESP32 Endpoint: Health Check / Heartbeat**

    Allows bins to report their status periodically.
    Updates last_seen_at timestamp and current load.

    Required Headers:
        - X-Bin-ID: Bin identifier
        - X-Timestamp: Unix timestamp
        - X-Signature: HMAC signature

    Returns:
        200 OK: Heartbeat acknowledged
        401 Unauthorized: HMAC signature invalid
    """
    try:
        # Verify signature
        body = await request.body()
        is_valid, bin, error_msg = verify_esp32_signature(
            bin_code=x_bin_id,
            timestamp=x_timestamp,
            signature=x_signature,
            body=body,
            db=db,
            request_ip=request.client.host if request.client else None
        )

        if not is_valid or not bin:
            raise HTTPException(status_code=401, detail=error_msg)

        # Update bin status
        bin.current_load_kg = data.current_load_kg
        bin.firmware_version = data.firmware_version
        bin.last_seen_at = datetime.utcnow()

        db.commit()

        logger.info(f"Heartbeat received from bin {x_bin_id}")

        return BinHeartbeatResponse(
            success=True,
            message="Heartbeat acknowledged",
            server_time=datetime.utcnow().isoformat() + "Z"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing heartbeat: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
