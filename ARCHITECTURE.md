# Smart Recycling Bin - System Architecture

## 1. Database Schema Overview

### Core Tables

#### **Users**

- Manages user accounts and accumulated rewards
- Tracks total points and discard count for gamification
- Email verification and account status for security

#### **SmartBins**

- Represents physical ESP32-CAM equipped bins
- Stores hardware API key for authentication
- Tracks location, capacity, and operational status
- Monitors firmware version and last communication

#### **ActiveSessions** (3-minute timeout)

- **Critical for triple validation**
- Links user → bin → current recycling session
- Auto-expires after 3 minutes to prevent abuse
- Tracks validation checkpoints (QR scan, weight, AI vision)
- Uses indexed `expires_at` for efficient cleanup queries

#### **Materials**

- Master data for recyclable material types
- Defines points-per-kg reward rates
- Stores AI classification mappings and confidence thresholds
- Enables dynamic material catalog updates

#### **Discards**

- **Triple validation checkpoint** (see section 4)
- Records weight, image, and AI classification
- Prevents point injection via fraud detection flags
- Immutable audit trail of all recycling events

#### **Rewards**

- Transaction ledger for points (earn/redeem)
- Links to discards for traceability
- Enables point redemption and bonus campaigns

#### **AuditLog**

- Security logging for all ESP32 requests
- Stores HMAC signatures for forensic analysis
- Tracks IP addresses and request patterns

---

## 2. Security Handshake (ESP32 ↔ Backend)

### Authentication Flow

```
┌─────────┐                  ┌─────────────┐                ┌──────────┐
│ ESP32   │                  │ Backend API │                │ Database │
│ CAM     │                  │ (FastAPI)   │                │ (MariaDB)│
└────┬────┘                  └──────┬──────┘                └────┬─────┘
     │                              │                            │
     │ 1. POST /v1/bin/upload       │                            │
     │    Headers:                  │                            │
     │    - X-Bin-ID: BIN_001       │                            │
     │    - X-Timestamp: 1234567890 │                            │
     │    - X-Signature: HMAC       │                            │
     │ ─────────────────────────────>                            │
     │                              │                            │
     │                         2. Validate Timestamp            │
     │                            (±5 min window)               │
     │                              │                            │
     │                         3. Query API Key                │
     │                              │ ───────────────────────────>
     │                              │ <───────────────────────────
     │                              │    hardware_api_key         │
     │                              │                            │
     │                         4. Compute HMAC-SHA256           │
     │                            signature = HMAC(              │
     │                              key=api_key,                 │
     │                              msg=bin_id+timestamp+body    │
     │                            )                              │
     │                              │                            │
     │                         5. Compare Signatures            │
     │                            (timing-safe compare)          │
     │                              │                            │
     │ <─────────────────────────────                            │
     │    200 OK / 401 Unauthorized │                            │
     │                              │                            │
```

### Implementation Details

**ESP32 Side (C/C++):**

```cpp
// Pseudo-code for ESP32
String timestamp = String(now());
String message = BIN_ID + timestamp + jsonBody;
String signature = hmac_sha256(HARDWARE_API_KEY, message);

httpClient.addHeader("X-Bin-ID", BIN_ID);
httpClient.addHeader("X-Timestamp", timestamp);
httpClient.addHeader("X-Signature", signature);
httpClient.POST("/v1/bin/upload", jsonBody);
```

**Backend Side (Python/FastAPI):**

```python
import hmac
import hashlib
from datetime import datetime, timedelta

def verify_esp32_signature(
    bin_id: str,
    timestamp: str,
    signature: str,
    body: bytes,
    db: Session
) -> bool:
    # 1. Validate timestamp (prevent replay attacks)
    request_time = datetime.fromtimestamp(int(timestamp))
    now = datetime.utcnow()
    if abs((now - request_time).total_seconds()) > 300:  # 5-min window
        return False

    # 2. Fetch hardware API key from database
    bin = db.query(SmartBin).filter(SmartBin.bin_code == bin_id).first()
    if not bin or bin.status != BinStatus.ACTIVE:
        return False

    # 3. Compute expected signature
    message = f"{bin_id}{timestamp}{body.decode()}"
    expected_signature = hmac.new(
        bin.hardware_api_key.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()

    # 4. Timing-safe comparison (prevent timing attacks)
    return hmac.compare_digest(signature, expected_signature)
```

### Key Security Features

1. **HMAC-SHA256** - Cryptographic message authentication
2. **Timestamp validation** - 5-minute window prevents replay attacks
3. **Per-bin API keys** - Key rotation without affecting other bins
4. **Timing-safe comparison** - Prevents timing-based attacks
5. **Audit logging** - All requests logged with signatures

---

## 3. Backend Directory Structure

```
back-end-tcc/
├── main.py                      # FastAPI application entry point
├── config.py                    # Environment variables and settings
├── models.py                    # SQLAlchemy models (already created)
├── database.py                  # Database connection and session management
├── requirements.txt             # Python dependencies
├── alembic.ini                  # Database migration config
│
├── api/
│   ├── __init__.py
│   ├── dependencies.py          # Auth, rate limiting, DB session
│   │
│   └── v1/
│       ├── __init__.py
│       ├── router.py            # Main v1 router aggregator
│       │
│       ├── endpoints/
│       │   ├── __init__.py
│       │   ├── auth.py          # User login, register, JWT
│       │   ├── users.py         # User profile, points, history
│       │   ├── bins.py          # Bin management (admin)
│       │   ├── upload.py        # /v1/bin/upload (ESP32 endpoint)
│       │   ├── sessions.py      # Active session management
│       │   ├── materials.py     # Material catalog CRUD
│       │   ├── discards.py      # Discard history and analytics
│       │   └── rewards.py       # Points, leaderboard, redemptions
│       │
│       └── schemas/
│           ├── __init__.py
│           ├── auth.py          # Pydantic models for auth
│           ├── user.py          # User request/response schemas
│           ├── bin.py           # SmartBin schemas
│           ├── session.py       # Session schemas
│           ├── discard.py       # Discard validation schemas
│           └── common.py        # Shared schemas (pagination, etc.)
│
├── services/
│   ├── __init__.py
│   ├── auth_service.py          # JWT, password hashing
│   ├── session_service.py       # Session creation, validation, expiry
│   ├── validation_service.py    # Triple validation logic
│   ├── ai_service.py            # AI model inference (vision classification)
│   ├── reward_service.py        # Points calculation and distribution
│   ├── storage_service.py       # S3/local image storage
│   └── security_service.py      # HMAC signature verification
│
├── core/
│   ├── __init__.py
│   ├── security.py              # Security utilities (HMAC, rate limiting)
│   ├── exceptions.py            # Custom exception classes
│   └── logging.py               # Structured logging setup
│
├── ml/
│   ├── __init__.py
│   ├── model.py                 # AI model loading and inference
│   ├── preprocessing.py         # Image preprocessing for vision
│   └── models/
│       └── recyclable_classifier.h5  # Trained TensorFlow/PyTorch model
│
├── migrations/                  # Alembic database migrations
│   ├── env.py
│   └── versions/
│
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest fixtures
│   ├── test_auth.py
│   ├── test_sessions.py
│   ├── test_validation.py       # Triple validation tests
│   └── test_security.py         # HMAC signature tests
│
├── scripts/
│   ├── seed_materials.py        # Populate materials table
│   ├── cleanup_sessions.py      # Cron job to expire old sessions
│   └── generate_bin_keys.py     # Generate hardware API keys
│
└── docs/
    ├── API.md                   # API documentation
    ├── DEPLOYMENT.md            # Production deployment guide
    └── ESP32_INTEGRATION.md     # Hardware integration guide
```

---

## 4. Triple Validation Logic for `/v1/bin/upload`

### Endpoint Purpose

Prevent point injection fraud by requiring **three independent validations** before awarding points.

### Validation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  /v1/bin/upload Endpoint                        │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 1: Hardware Authentication (ESP32)         │
     │  - Verify HMAC signature                         │
     │  - Check timestamp (replay attack prevention)    │
     │  - Validate bin is ACTIVE                        │
     └──────────────────┬───────────────────────────────┘
                        │ PASS
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 2: Session Validation (User Context)       │
     │  - Check if active session exists for this bin   │
     │  - Verify session not expired (<3 minutes)       │
     │  - Ensure session.status == ACTIVE               │
     │  - Match user_id from session                    │
     └──────────────────┬───────────────────────────────┘
                        │ PASS
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 3: Weight Validation (Load Cell)           │
     │  - Validate weight > material.min_weight_grams   │
     │  - Check weight is realistic (< 10kg per item)   │
     │  - Compare with bin's max capacity               │
     │  - Flag if weight is anomalous                   │
     └──────────────────┬───────────────────────────────┘
                        │ PASS
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 4: AI Vision Validation (ESP32-CAM)        │
     │  - Run image through classification model        │
     │  - Check AI confidence >= material.threshold     │
     │  - Match detected class with expected material   │
     │  - Store image for audit trail                   │
     └──────────────────┬───────────────────────────────┘
                        │ PASS
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 5: Fraud Detection (Anti-Gaming)           │
     │  - Check user's recent discard frequency         │
     │  - Detect identical images (hash comparison)     │
     │  - Flag suspiciously high accuracy users         │
     │  - Rate limit: max 10 discards per session       │
     └──────────────────┬───────────────────────────────┘
                        │ PASS
                        ▼
     ┌──────────────────────────────────────────────────┐
     │  Step 6: Award Points & Update Session           │
     │  - Calculate points = weight_kg * points_per_kg  │
     │  - Create Discard record (validated=True)        │
     │  - Create Reward transaction                     │
     │  - Update User.total_points atomically          │
     │  - Mark session validation checkpoints           │
     └──────────────────────────────────────────────────┘
```

### Anti-Fraud Mechanisms

1. **Rate Limiting**
   - Max 10 discards per session
   - Max 100 discards per user per day
   - Exponential backoff for repeated violations

2. **Image Deduplication**
   - Compute perceptual hash (pHash) of each image
   - Reject if identical image submitted within 24 hours
   - Flags user if >50% of images are duplicates

3. **Weight Anomaly Detection**
   - Reject items heavier than 10kg (unrealistic for single items)
   - Flag if user consistently weighs at exact thresholds
   - ML-based outlier detection for weight patterns

4. **Session Timeout Enforcement**
   - Hard 3-minute limit from session start
   - Background worker expires sessions every 30 seconds
   - Rejected uploads if session expired mid-request

5. **AI Confidence Thresholds**
   - Reject if confidence < material.confidence_threshold
   - Flag for manual review if confidence between 0.6-0.75
   - Automatically accept if confidence > 0.9

### Validation Error Responses

```python
# Example error responses
{
    "error": "session_expired",
    "message": "Your session has expired. Please scan the QR code again.",
    "code": 403
}

{
    "error": "weight_validation_failed",
    "message": "Weight (0.5g) is below minimum threshold (10g)",
    "code": 422
}

{
    "error": "ai_classification_failed",
    "message": "Material classification confidence too low (0.45 < 0.70)",
    "details": {
        "detected": "plastic_bottle",
        "confidence": 0.45,
        "threshold": 0.70
    },
    "code": 422
}

{
    "error": "rate_limit_exceeded",
    "message": "Maximum 10 discards per session. Please start a new session.",
    "code": 429
}
```

---

## 5. Critical Implementation Notes

### Database Transactions

- Use `SERIALIZABLE` isolation for points updates to prevent race conditions
- Atomic `User.total_points` updates with optimistic locking

### Session Cleanup

- Background Celery task runs every 30 seconds
- Marks expired sessions as `EXPIRED`
- Prevents session table bloat

### Image Storage

- Store images in S3 or local filesystem (not database)
- Keep `image_path` in database for reference
- Implement lifecycle policy (delete after 90 days)

### AI Model Deployment

- Use TensorFlow Lite or ONNX for ESP32-CAM (edge inference)
- Fallback to backend inference if ESP32 lacks resources
- Version models to allow A/B testing

### Monitoring & Alerts

- Track validation failure rates per bin
- Alert if >20% of requests fail signature validation
- Monitor session expiry rates (should be <5%)

---

## 6. Next Steps

1. **Backend API Development**
   - Implement `/v1/bin/upload` endpoint
   - Build session management endpoints
   - Create user authentication (JWT)

2. **ESP32 Firmware**
   - Implement HMAC signature generation
   - Integrate camera capture and weight sensor
   - Add retry logic for failed uploads

3. **AI Model Training**
   - Collect labeled dataset of recyclable materials
   - Train EfficientNet or MobileNet model
   - Convert to TensorFlow Lite for edge deployment

4. **Mobile App**
   - QR code scanner to start sessions
   - Real-time points display
   - Discard history and leaderboard

5. **Admin Dashboard**
   - Monitor bin health and status
   - Review flagged discards
   - Analytics on recycling patterns

---

**Architecture Version:** 1.0
**Last Updated:** 2026-03-26
**Author:** CTO/Senior Developer
