# 🔄 System Flow Diagrams

## 1. Complete User Journey Flow

```
┌──────────────┐
│ Mobile App   │
│ (User)       │
└──────┬───────┘
       │
       │ 1. Scan QR Code on Smart Bin
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ POST /v1/sessions/start                                      │
│ Headers: Authorization: Bearer <JWT_TOKEN>                   │
│ Body: { "bin_code": "BIN_001" }                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ Backend API     │
         │                 │
         │ 1. Validate JWT │
         │ 2. Check bin    │
         │    is active    │
         │ 3. Create       │
         │    ActiveSession│
         │    (expires in  │
         │     3 minutes)  │
         └────────┬────────┘
                  │
                  ▼
    ┌─────────────────────────────┐
    │ Response:                   │
    │ {                           │
    │   "session_id": "abc123",   │
    │   "session_token": "...",   │
    │   "expires_at": "13:03:00"  │
    │ }                           │
    └──────────┬──────────────────┘
               │
               │ 2. User deposits recyclable item
               │    (Physical action)
               │
               ▼
    ┌──────────────────────────┐
    │ ESP32-CAM Smart Bin      │
    │                          │
    │ Sensors Activated:       │
    │ ⚖️  Weight: 245g         │
    │ 📸 Image: bottle.jpg     │
    └──────────┬───────────────┘
               │
               │ 3. ESP32 sends data to backend
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│ POST /v1/bin/upload                                          │
│                                                              │
│ Headers:                                                     │
│   X-Bin-ID: BIN_001                                          │
│   X-Timestamp: 1234567890                                    │
│   X-Signature: hmac_sha256(...)                              │
│                                                              │
│ Body:                                                        │
│   {                                                          │
│     "session_token": "abc123",                               │
│     "weight_grams": 245,                                     │
│     "image": "<base64_encoded_image>"                        │
│   }                                                          │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ TRIPLE VALIDATION PIPELINE                                   │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDATION 1: HMAC Signature                            │ │
│ │ ✓ Verify ESP32 signature                                │ │
│ │ ✓ Check timestamp (±5 min)                              │ │
│ │ ✓ Confirm bin is active                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASS                             │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDATION 2: Active Session                            │ │
│ │ ✓ Session exists and status=ACTIVE                      │ │
│ │ ✓ Not expired (< 3 minutes)                             │ │
│ │ ✓ Session matches bin_id                                │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASS                             │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDATION 3: Weight                                    │ │
│ │ ✓ Weight >= 10g (min threshold)                         │ │
│ │ ✓ Weight <= 10kg (max realistic)                        │ │
│ │ ✓ No weight anomaly detected                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASS                             │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDATION 4: AI Vision Classification                  │ │
│ │ 1. Run image through TensorFlow model                   │ │
│ │ 2. Detect: "plastic_pet" (confidence: 0.92)             │ │
│ │ 3. Check confidence >= 0.70 threshold                   │ │
│ │ 4. Match with Materials table                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ PASS                             │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ VALIDATION 5: Fraud Detection                           │ │
│ │ ✓ Not duplicate image (perceptual hash)                │ │
│ │ ✓ User < 10 discards this session                       │ │
│ │ ✓ User < 100 discards today                             │ │
│ │ ✓ No suspicious patterns detected                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                           │ ALL PASS                         │
│                           ▼                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ AWARD POINTS                                            │ │
│ │                                                         │ │
│ │ Calculation:                                            │ │
│ │   weight_kg = 245g / 1000 = 0.245 kg                    │ │
│ │   points_per_kg = 120 (PET Plastic)                     │ │
│ │   points = 0.245 * 120 = 29 points                      │ │
│ │                                                         │ │
│ │ Database Transactions:                                  │ │
│ │ 1. INSERT INTO discards (validated=true, points=29)     │ │
│ │ 2. INSERT INTO rewards (points=29, type='discard')      │ │
│ │ 3. UPDATE users SET total_points += 29                  │ │
│ │ 4. UPDATE active_sessions (validation checkpoints)      │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Response to ESP32:  │
         │ {                   │
         │   "success": true,  │
         │   "points": 29,     │
         │   "material": "PET" │
         │ }                   │
         └─────────┬───────────┘
                   │
                   │ 4. ESP32 displays success LED
                   │
                   ▼
         ┌─────────────────────┐
         │ Push Notification:  │
         │ "🎉 +29 points!"    │
         │ "PET Plastic"       │
         └─────────┬───────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │ Update Mobile App   │
         │ Show new total:     │
         │ "1,234 points"      │
         └─────────────────────┘
```

---

## 2. ESP32 Security Handshake (Detailed)

```
┌─────────────┐                                    ┌─────────────┐
│   ESP32     │                                    │   Backend   │
│   CAM       │                                    │   API       │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │ 1. Capture Event (weight change detected)       │
       │                                                  │
       ├──────────────────────────────────────────────────────────┐
       │ Prepare Request:                                         │
       │                                                          │
       │   bin_id = "BIN_001"                                     │
       │   timestamp = 1711234567 (Unix epoch)                    │
       │   payload = {"session_token": "abc", "weight": 245}      │
       │                                                          │
       │   // Signature Generation                                │
       │   message = bin_id + timestamp + JSON.stringify(payload) │
       │   signature = HMAC-SHA256(HARDWARE_API_KEY, message)     │
       └──────────────────────────────────────────────────────────┘
       │
       │ POST /v1/bin/upload
       │ X-Bin-ID: BIN_001
       │ X-Timestamp: 1711234567
       │ X-Signature: 3f89a2b... (64 chars hex)
       │ Body: {"session_token": "abc", "weight": 245, ...}
       ├────────────────────────────────────────────────>
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 1. Timestamp Check    │
       │                                    │    now = 1711234570   │
       │                                    │    diff = 3 seconds   │
       │                                    │    ✓ Within ±5min     │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 2. Database Query     │
       │                                    │    SELECT api_key     │
       │                                    │    FROM smart_bins    │
       │                                    │    WHERE code=BIN_001 │
       │                                    │    AND status=ACTIVE  │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 3. Compute Expected   │
       │                                    │    msg = BIN_001 +    │
       │                                    │          1711234567 + │
       │                                    │          payload      │
       │                                    │    expected_sig =     │
       │                                    │    HMAC(api_key, msg) │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 4. Secure Compare     │
       │                                    │    hmac.compare_      │
       │                                    │    digest(            │
       │                                    │      received_sig,    │
       │                                    │      expected_sig     │
       │                                    │    )                  │
       │                                    │    ✓ Match!           │
       │                                    └─────────────┬────────┘
       │                                                  │
       │                                    ┌─────────────┴────────┐
       │                                    │ 5. Log Audit Event    │
       │                                    │    INSERT audit_logs  │
       │                                    │    (event=bin_upload, │
       │                                    │     signature=valid)  │
       │                                    └─────────────┬────────┘
       │                                                  │
       │ <────────────────────────────────────────────────┤
       │ 200 OK - Proceed with validation                │
       │                                                  │
       │                                                  │
       │ ❌ ALTERNATIVE: Signature Invalid                │
       │ <────────────────────────────────────────────────┤
       │ 401 Unauthorized                                 │
       │ {"error": "invalid_signature"}                   │
       │                                                  │
       ├──────────────────────────────────────────────────────────┐
       │ ESP32 Error Handling:                                    │
       │   - Log failure                                          │
       │   - Retry 3 times with exponential backoff               │
       │   - If still fails, store locally and sync later         │
       │   - Display error LED to user                            │
       └──────────────────────────────────────────────────────────┘
```

---

## 3. Session Lifecycle and Timeout Management

```
┌─────────────────────────────────────────────────────────────┐
│                  SESSION LIFECYCLE                          │
└─────────────────────────────────────────────────────────────┘

TIME: 13:00:00 - User scans QR code
        │
        ▼
┌───────────────────────────────┐
│ ActiveSession Created         │
│ session_id: 123               │
│ user_id: 456                  │
│ bin_id: 1                     │
│ status: ACTIVE                │
│ started_at: 13:00:00          │
│ expires_at: 13:03:00          │
└───────────────────────────────┘
        │
        │
TIME: 13:00:30 - First discard (+30s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #1 Created            │
│ weight_validated: ✓           │
│ vision_validated: ✓           │
│ session_validated: ✓          │
│ points_awarded: 29            │
└───────────────────────────────┘
        │
        │
TIME: 13:01:15 - Second discard (+1m 15s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #2 Created            │
│ Session still valid (< 3min)  │
│ points_awarded: 15            │
└───────────────────────────────┘
        │
        │
TIME: 13:02:45 - Third discard (+2m 45s)
        │
        ▼
┌───────────────────────────────┐
│ Discard #3 Created            │
│ ⚠️  Warning: 15s remaining    │
│ points_awarded: 22            │
└───────────────────────────────┘
        │
        │
TIME: 13:03:05 - Fourth discard attempt (+3m 5s)
        │
        ▼
┌───────────────────────────────┐
│ ❌ SESSION EXPIRED            │
│ Rejection Response:           │
│ {                             │
│   "error": "session_expired", │
│   "expired_at": "13:03:00",   │
│   "current_time": "13:03:05"  │
│ }                             │
└───────────────────────────────┘
        │
        │ Background Celery Task (runs every 30s)
        │
        ▼
┌───────────────────────────────┐
│ Session Cleanup Worker        │
│                               │
│ UPDATE active_sessions        │
│ SET status = 'EXPIRED'        │
│ WHERE expires_at < NOW()      │
│ AND status = 'ACTIVE'         │
│                               │
│ Affected: 1 row               │
└───────────────────────────────┘
```

---

## 4. Database Entity Relationships

```
┌─────────────┐
│   Users     │
│─────────────│
│ id (PK)     │───┐
│ email       │   │
│ username    │   │
│ total_points│   │
│ created_at  │   │
└─────────────┘   │
                  │
                  │ 1:N
                  │
       ┌──────────┴──────────────────────────────┐
       │                                         │
       ▼                                         ▼
┌────────────────┐                      ┌─────────────┐
│ ActiveSessions │                      │  Discards   │
│────────────────│                      │─────────────│
│ id (PK)        │──────1:N────────────>│ id (PK)     │
│ user_id (FK)   │                      │ session_id  │
│ bin_id (FK)    │◄──┐                  │ user_id (FK)│
│ session_token  │   │                  │ bin_id (FK) │
│ started_at     │   │                  │ material_id │
│ expires_at     │   │                  │ weight_grams│
│ status         │   │                  │ ai_class... │
└────────────────┘   │                  │ points_...  │
                     │                  │ validated   │
                     │                  └─────────────┘
                     │                         │
                     │ N:1                     │ N:1
                     │                         │
              ┌──────┴──────┐           ┌─────┴────────┐
              │             │           │              │
              ▼             │           ▼              │
      ┌─────────────┐       │   ┌─────────────┐       │
      │  SmartBins  │       │   │  Materials  │       │
      │─────────────│       │   │─────────────│       │
      │ id (PK)     │       │   │ id (PK)     │       │
      │ bin_code    │       │   │ name        │       │
      │ api_key     │       │   │ category    │       │
      │ location    │       │   │ points_/kg  │       │
      │ status      │       │   │ ai_class... │       │
      └─────────────┘       │   └─────────────┘       │
              │             │                         │
              │ 1:N         │                         │
              │             │                         │
              └─────────────┴─────────────────────────┤
                                                      │
                                                      │ N:1
                                                      │
                                              ┌───────┴──────┐
                                              │   Rewards    │
                                              │──────────────│
                                              │ id (PK)      │
                                              │ user_id (FK) │
                                              │ discard_id   │
                                              │ points       │
                                              │ type         │
                                              │ created_at   │
                                              └──────────────┘
```

---

## 5. Anti-Fraud Detection Pipeline

```
┌────────────────────────────────────────────────────────────┐
│          FRAUD DETECTION CHECKPOINTS                       │
└────────────────────────────────────────────────────────────┘

Every /v1/bin/upload request passes through:

┌─────────────────────────────────────────────────────────┐
│ Checkpoint 1: Rate Limiting                             │
│                                                         │
│ SELECT COUNT(*) FROM discards                           │
│ WHERE user_id = ? AND session_id = ?                    │
│                                                         │
│ IF count >= 10:                                         │
│   → REJECT (429: rate_limit_exceeded)                   │
│                                                         │
│ SELECT COUNT(*) FROM discards                           │
│ WHERE user_id = ? AND DATE(created_at) = TODAY()        │
│                                                         │
│ IF count >= 100:                                        │
│   → REJECT (429: daily_limit_exceeded)                  │
└─────────────────────────────────────────────────────────┘
                         │ PASS
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 2: Image Duplicate Detection                 │
│                                                         │
│ 1. Compute perceptual hash (pHash) of uploaded image    │
│    phash = imagehash.phash(image)                       │
│                                                         │
│ 2. Query recent discards with similar hashes            │
│    SELECT * FROM discards                               │
│    WHERE user_id = ?                                    │
│    AND created_at > NOW() - INTERVAL 24 HOUR            │
│                                                         │
│ 3. Compare Hamming distance                             │
│    FOR EACH previous_discard:                           │
│      distance = hamming_distance(phash, prev_phash)     │
│      IF distance < 5 (very similar):                    │
│        → FLAG as suspicious                             │
│        → Still allow but log for review                 │
└─────────────────────────────────────────────────────────┘
                         │ PASS
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 3: Weight Anomaly Detection                  │
│                                                         │
│ 1. Get user's weight history                            │
│    SELECT AVG(weight_grams) as avg,                     │
│           STDDEV(weight_grams) as stddev                │
│    FROM discards WHERE user_id = ?                      │
│                                                         │
│ 2. Calculate Z-score                                    │
│    z_score = (current_weight - avg) / stddev            │
│                                                         │
│ 3. Check for anomalies                                  │
│    IF ABS(z_score) > 2.5:                               │
│      → FLAG as anomalous                                │
│      → Require manual review if confidence < 0.9        │
│                                                         │
│ 4. Check for "gaming the system"                        │
│    IF weight consistently at minimum threshold:         │
│      → FLAG user for investigation                      │
└─────────────────────────────────────────────────────────┘
                         │ PASS
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 4: AI Confidence Validation                  │
│                                                         │
│ IF confidence < 0.60:                                   │
│   → REJECT (classification too uncertain)               │
│                                                         │
│ IF 0.60 <= confidence < 0.75:                           │
│   → FLAG for manual review                              │
│   → Still award points but mark for audit               │
│                                                         │
│ IF confidence >= 0.75:                                  │
│   → AUTO-APPROVE                                        │
└─────────────────────────────────────────────────────────┘
                         │ PASS
                         ▼
┌─────────────────────────────────────────────────────────┐
│ Checkpoint 5: Behavioral Pattern Analysis               │
│                                                         │
│ Calculate user metrics:                                 │
│   - Average time between discards                       │
│   - Variance in material types                          │
│   - Consistency in weight measurements                  │
│   - Success rate (validated / total attempts)           │
│                                                         │
│ IF success_rate > 95% AND total_discards > 50:          │
│   → FLAG as "too perfect" (possible fraud)              │
│                                                         │
│ IF avg_time_between_discards < 10 seconds:              │
│   → FLAG as "rapid fire" (possible automation)          │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
                  ✅ ALL CHECKS PASSED
                     Award Points
```

---

**Created for Eco Mais Smart Recycling Project**
**Last Updated: 2026-03-26**
