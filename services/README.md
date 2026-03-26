# Services Layer Documentation

This directory contains the business logic layer for Eco Mais.

## 📁 Services Overview

### `background_tasks.py` ⭐
**Purpose:** Asynchronous processing using FastAPI BackgroundTasks

**Key Functions:**
- `save_image_to_disk(image_base64, discard_id)` - Saves uploaded images locally
- `process_image_with_ai(discard_id, image_path, db)` - ⭐ **Main background task**
  - Runs AI classification on image
  - Updates discard record with AI results
  - Awards points if all validations pass
  - Updates user's total_points atomically
- `cleanup_expired_sessions(db)` - Marks expired sessions
- `check_duplicate_image(user_id, image_path, db)` - Fraud detection (MVP: placeholder)
- `mock_ai_classification(image_path)` - Temporary mock AI (replace with real model)

**Usage Example:**
```python
from fastapi import BackgroundTasks
from services.background_tasks import process_image_with_ai

@app.post("/upload")
async def upload(background_tasks: BackgroundTasks):
    # Save image and create discard record
    image_path = save_image_to_disk(image_data, discard_id)

    # Process AI in background (returns 200 OK immediately)
    background_tasks.add_task(
        process_image_with_ai,
        discard_id=discard_id,
        image_path=image_path,
        db=db
    )

    return {"success": True, "processing_status": "pending"}
```

---

### `security_service.py` 🔐
**Purpose:** ESP32 authentication and security

**Key Functions:**
- `verify_esp32_signature(bin_code, timestamp, signature, body, db, request_ip)`
  - Verifies HMAC-SHA256 signature from ESP32
  - Checks timestamp (±5 min window) to prevent replay attacks
  - Validates bin is active
  - Logs audit events
- `log_audit_event(db, event_type, bin_code, ip_address, signature, ...)`
  - Logs all security events to audit_logs table
- `generate_hardware_api_key()`
  - Generates new API keys for bins

**Security Flow:**
```
1. ESP32 computes: HMAC-SHA256(api_key, bin_id + timestamp + body)
2. Backend fetches api_key from database
3. Backend computes expected signature
4. Timing-safe comparison: hmac.compare_digest(received, expected)
5. Log success/failure to audit_logs
```

**Usage Example:**
```python
from services.security_service import verify_esp32_signature

is_valid, bin, error_msg = verify_esp32_signature(
    bin_code="BIN_001",
    timestamp="1234567890",
    signature="3f89a2b...",
    body=request_body,
    db=db,
    request_ip="192.168.1.10"
)

if not is_valid:
    raise HTTPException(status_code=401, detail=error_msg)
```

---

### `validation_service.py` ✅
**Purpose:** Triple validation logic (Session + Weight + AI)

**Key Functions:**

#### `validate_session(session_token, bin_id, db)`
Checks:
- Session exists
- Session is for correct bin
- Session status is ACTIVE
- Session not expired (< 3 minutes)

Returns: `(is_valid, session, error_message)`

#### `validate_weight(weight_grams, user_id, db)`
Checks:
- Weight >= MIN_WEIGHT_GRAMS (default: 10g)
- Weight <= MAX_WEIGHT_GRAMS (default: 10kg)
- Weight not anomalous (MVP: placeholder)

Returns: `(is_valid, error_message)`

#### `check_rate_limits(user_id, session_id, db)`
Checks:
- Discards this session < MAX_DISCARDS_PER_SESSION (default: 10)
- Discards today < MAX_DISCARDS_PER_DAY (default: 100)

Returns: `(is_allowed, error_message)`

#### `create_discard_record(session, bin, weight_grams, image_path, db)`
Creates new Discard record with:
- session_validated = True (already checked)
- weight_validated = True (already checked)
- vision_validated = False (pending AI)
- is_validated = False (overall pending)

Returns: `Discard` object

**Usage Example:**
```python
from services.validation_service import (
    validate_session,
    validate_weight,
    check_rate_limits,
    create_discard_record
)

# Step 1: Validate session
is_valid, session, error = validate_session(token, bin_id, db)
if not is_valid:
    raise HTTPException(403, error)

# Step 2: Validate weight
is_valid, error = validate_weight(weight_grams, user_id, db)
if not is_valid:
    raise HTTPException(422, error)

# Step 3: Check rate limits
is_allowed, error = check_rate_limits(user_id, session.id, db)
if not is_allowed:
    raise HTTPException(429, error)

# Step 4: Create discard record
discard = create_discard_record(session, bin, weight_grams, image_path, db)
```

---

## 🔄 Service Interaction Flow

```
┌─────────────────────────────────────────────────────────┐
│           /v1/bin/upload Endpoint Flow                  │
└─────────────────────────────────────────────────────────┘

1. security_service.verify_esp32_signature()
   ↓ PASS (401 if fail)

2. validation_service.validate_session()
   ↓ PASS (403 if fail)

3. validation_service.validate_weight()
   ↓ PASS (422 if fail)

4. validation_service.check_rate_limits()
   ↓ PASS (429 if fail)

5. background_tasks.save_image_to_disk()
   ↓ Image saved

6. validation_service.create_discard_record()
   ↓ DB record created

7. Return 200 OK immediately to ESP32 ✅

8. BackgroundTasks.add_task(process_image_with_ai)
   ↓ Async processing starts

9. background_tasks.process_image_with_ai()
   - Run AI classification
   - Update discard with results
   - Award points if validated
   - Update user total_points

10. Done! ✅
```

---

## 🧪 Testing Services

### Test security_service
```python
from services.security_service import verify_esp32_signature
from database import SessionLocal

db = SessionLocal()

is_valid, bin, error = verify_esp32_signature(
    bin_code="BIN_TEST_001",
    timestamp="1234567890",
    signature="test_signature",
    body=b'{"test": "data"}',
    db=db
)

print(f"Valid: {is_valid}, Error: {error}")
```

### Test validation_service
```python
from services.validation_service import validate_weight

is_valid, error = validate_weight(245.5, user_id=1, db=db)
print(f"Weight valid: {is_valid}, Error: {error}")
```

### Test background_tasks (mock)
```python
from services.background_tasks import mock_ai_classification

result = mock_ai_classification("path/to/image.jpg")
print(f"AI Result: {result}")
# Output: {'class_name': 'plastic_pet', 'confidence': 0.85}
```

---

## 📝 Adding New Services

### Example: Creating a Notification Service

1. Create `services/notification_service.py`:
```python
"""
Notification Service
Sends notifications to users (email, push, SMS)
"""

import logging

logger = logging.getLogger(__name__)

def send_points_notification(user_id: int, points: int):
    """Send notification when points are awarded"""
    # TODO: Implement email/push notification
    logger.info(f"User {user_id} earned {points} points")
```

2. Use in background task:
```python
# In background_tasks.py
from services.notification_service import send_points_notification

def process_image_with_ai(...):
    # ... award points ...

    # Send notification
    send_points_notification(user.id, points)
```

---

## 🔮 Future Enhancements

### When to Add Celery
Consider migrating to Celery when:
- Processing >100 uploads/minute
- Need distributed workers
- Need task retry logic
- Need scheduled periodic tasks

### Migration Path
```python
# Current (BackgroundTasks)
background_tasks.add_task(process_image_with_ai, discard_id, image_path, db)

# Future (Celery)
from tasks import process_image_with_ai_task
process_image_with_ai_task.delay(discard_id, image_path)
```

Services stay the same - just change the execution mechanism!

---

## 📚 References

- FastAPI BackgroundTasks: https://fastapi.tiangolo.com/tutorial/background-tasks/
- HMAC Authentication: https://en.wikipedia.org/wiki/HMAC
- SQLAlchemy Sessions: https://docs.sqlalchemy.org/en/14/orm/session.html

---

**Version:** 1.0 (MVP)
**Last Updated:** 2026-03-26
