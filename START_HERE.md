# 🎯 START HERE - Quick Implementation Guide

Welcome to your refactored Eco Mais MVP! This guide will get you running in 5 minutes.

---

## ⚡ Super Quick Start (5 Minutes)

### 1. Install Dependencies (2 min)
```bash
cd /Users/pauloed/Documents/Eco_Mais
cd back-end-tcc

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install all dependencies (no Redis/Celery needed!)
pip install -r requirements.txt
```

### 2. Setup Database (2 min)
```bash
# Create database
mysql -u root -p << EOF
CREATE DATABASE eco_mais_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eco_mais_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON eco_mais_db.* TO 'eco_mais_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Configure environment
cp .env.example .env
# Edit DB_PASSWORD in .env to match your password

# Initialize database with test data
python setup.py
```

**⚠️ IMPORTANT:** Copy the Hardware API Key printed by setup.py!

### 3. Start API (1 min)
```bash
# Start FastAPI server
uvicorn main:app --reload

# Server runs at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### 4. Test It
```bash
# In another terminal
curl http://localhost:8000/health

# Should return:
# {"status":"healthy","database":"connected",...}
```

**🎉 Done! Your API is running!**

---

## 📸 What's Working Right Now

### ✅ Implemented Endpoints

1. **`GET /health`** - Health check
   ```bash
   curl http://localhost:8000/health
   ```

2. **`POST /v1/bin/upload`** ⭐ - Triple validation with background AI
   - HMAC signature authentication
   - Session validation
   - Weight validation
   - Immediate 200 OK response
   - AI processing in background
   - Automatic points awarding

3. **`POST /v1/bin/heartbeat`** - Bin status reporting
   - Hardware health monitoring
   - Last seen timestamp update

### 📖 Interactive Documentation
Visit http://localhost:8000/docs to see Swagger UI with all endpoints!

---

## 🧪 Testing the Upload Endpoint

### Option 1: Use the Test Script
```bash
# Update credentials in test_api.py first:
# - HARDWARE_API_KEY (from setup.py output)
# - SESSION_TOKEN (from database)

python test_api.py
```

### Option 2: Manual Testing with Swagger UI
1. Go to http://localhost:8000/docs
2. Find `POST /v1/bin/upload`
3. Click "Try it out"
4. You'll need to provide:
   - Headers: `X-Bin-ID`, `X-Timestamp`, `X-Signature`
   - Body: `session_token`, `weight_grams`, `image` (base64)

### Option 3: Create a Test Session
```python
# Run in Python console
from database import SessionLocal
from models import ActiveSession, SessionStatus
from datetime import datetime, timedelta
import secrets

db = SessionLocal()

# Create test session
session = ActiveSession(
    session_token=secrets.token_urlsafe(32),
    user_id=1,  # Test user created by setup.py
    bin_id=1,   # Test bin created by setup.py
    started_at=datetime.utcnow(),
    expires_at=datetime.utcnow() + timedelta(minutes=3),
    status=SessionStatus.ACTIVE,
    qr_code_scanned=True
)
db.add(session)
db.commit()

print(f"Session Token: {session.session_token}")
```

---

## 📂 Key Files You Should Know

### Core Application
- **`back-end-tcc/main.py`** - FastAPI application entry point
- **`back-end-tcc/models.py`** - Database schema (8 tables)
- **`back-end-tcc/database.py`** - DB connection management
- **`back-end-tcc/config.py`** - All configuration settings

### Services (Business Logic)
- **`back-end-tcc/services/background_tasks.py`** - AI processing, image saving
- **`back-end-tcc/services/security_service.py`** - HMAC authentication
- **`back-end-tcc/services/validation_service.py`** - Triple validation

### API Layer
- **`back-end-tcc/api/v1/endpoints/upload.py`** - Upload & heartbeat endpoints
- **`back-end-tcc/api/v1/schemas/bin.py`** - Request/response models

### Documentation
- **`MVP_REFACTORING.md`** - ⭐ What changed and why
- **`README.md`** - Full project documentation
- **`QUICK_REFERENCE.md`** - One-page cheat sheet
- **`back-end-tcc/services/README.md`** - Services layer docs

---

## 🔍 Checking If Everything Works

### 1. Database Tables Created?
```bash
mysql -u eco_mais_user -p eco_mais_db -e "SHOW TABLES;"

# Should show 7 tables:
# active_sessions, audit_logs, discards, materials,
# rewards, smart_bins, users
```

### 2. Test Data Seeded?
```bash
mysql -u eco_mais_user -p eco_mais_db << EOF
SELECT name, category, points_per_kg FROM materials LIMIT 3;
SELECT username, email, total_points FROM users;
SELECT bin_code, location_name, status FROM smart_bins;
EOF
```

### 3. API Health Check?
```bash
curl http://localhost:8000/health | jq

# Should return:
# {
#   "status": "healthy",
#   "database": "connected",
#   "app": "Eco Mais Smart Recycling",
#   "version": "1.0.0"
# }
```

### 4. Background Tasks Working?
Check logs when upload happens:
```bash
# In API terminal, you'll see:
# INFO: Starting AI processing for discard 1
# INFO: Awarded 29 points to user 1
```

---

## 🐛 Common Issues & Solutions

### Issue: "Database connection failed"
**Solution:**
```bash
# Check MariaDB is running
sudo systemctl status mariadb  # Linux
brew services list | grep mariadb  # macOS

# Test connection manually
mysql -u eco_mais_user -p eco_mais_db

# Check .env file has correct credentials
cat .env | grep DB_
```

### Issue: "Module not found" errors
**Solution:**
```bash
# Make sure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Issue: "Port 8000 already in use"
**Solution:**
```bash
# Find process using port 8000
lsof -ti:8000

# Kill it
kill $(lsof -ti:8000)

# Or use different port
uvicorn main:app --reload --port 8001
```

### Issue: HMAC signature verification fails
**Solution:**
- Make sure timestamp is within ±5 minutes of server time
- Use the EXACT body that was used to generate signature
- Check Hardware API Key is correct (from setup.py output)
- Verify bin_code matches database

---

## 🎓 Understanding the Triple Validation

```
Request → /v1/bin/upload
   ↓
1️⃣ HMAC Signature Validation (ESP32 Authentication)
   ✅ Timestamp within ±5 min
   ✅ Signature matches expected
   ✅ Bin exists and is active
   ↓
2️⃣ Session Validation (User Context)
   ✅ Session token valid
   ✅ Session not expired (<3 min)
   ✅ Session matches bin
   ↓
3️⃣ Weight Validation (Realistic Range)
   ✅ Weight >= 10g
   ✅ Weight <= 10kg
   ✅ No anomalies (MVP: placeholder)
   ↓
4️⃣ Rate Limiting (Fraud Prevention)
   ✅ < 10 discards this session
   ✅ < 100 discards today
   ↓
5️⃣ Save Image & Create Record
   ✅ Image saved to disk
   ✅ Discard record created
   ↓
6️⃣ Return 200 OK Immediately ⚡
   ↓
7️⃣ Background Processing (Async)
   🤖 AI classification
   💰 Award points if validated
   📊 Update user total_points
```

---

## 🚀 Next Steps

### Immediate (REST OF THIS WEEK)
1. ✅ Get the API running (you just did this!)
2. Add the trained YOLO model at `back-end-tcc/ml/models/recyclable_classifier.pt`
3. Test with real ESP32 hardware

### Short Term (NEXT 1-2 WEEKS)
4. Implement `/v1/sessions/start` endpoint
5. Add user authentication (JWT)
6. Create user profile endpoints
7. Build simple frontend (React/Vue)

### Medium Term (NEXT 3-4 WEEKS)
8. Train AI model with real dataset
9. Deploy to cloud (AWS/DigitalOcean)
10. Implement mobile app (React Native)
11. Add admin dashboard

### Before TCC Defense
12. Write comprehensive tests
13. Document architecture decisions
14. Prepare demo video
15. Create presentation slides

---

## 📚 Learning Resources

### FastAPI
- Official Tutorial: https://fastapi.tiangolo.com/tutorial/
- BackgroundTasks: https://fastapi.tiangolo.com/tutorial/background-tasks/

### SQLAlchemy
- ORM Tutorial: https://docs.sqlalchemy.org/en/14/orm/tutorial.html
- Relationships: https://docs.sqlalchemy.org/en/14/orm/basic_relationships.html

### ESP32 Integration
- Arduino HMAC: https://github.com/h5p9sl/hmac_sha256
- ESP32 HTTP POST: https://randomnerdtutorials.com/esp32-http-post-data/

### AI/ML
- TensorFlow Lite: https://www.tensorflow.org/lite
- Image Classification: https://keras.io/examples/vision/

---

## 💬 Need Help?

### Check Documentation
1. **MVP_REFACTORING.md** - What changed in this refactoring
2. **ARCHITECTURE.md** - Original architecture design
3. **services/README.md** - Services layer explanation

### Debug Tips
- Enable SQL logging: Set `echo=True` in `database.py`
- Add more logging: `logger.info("Your message")` in any service
- Use debugger: `import pdb; pdb.set_trace()`
- Check FastAPI logs for errors

### Common Commands
```bash
# View logs in real-time
tail -f logs/app.log  # (if logging to file)

# Check database
mysql -u eco_mais_user -p eco_mais_db

# Restart API
# Ctrl+C to stop, then:
uvicorn main:app --reload

# Run with debug logging
LOG_LEVEL=DEBUG uvicorn main:app --reload
```

---

## 🎯 Your Goal for Today

**Get a successful upload!**

Checklist:
- [ ] API running at http://localhost:8000
- [ ] Health check returns "healthy"
- [ ] Can see Swagger docs
- [ ] Test data exists in database
- [ ] (Optional) Successfully POST to /v1/bin/upload

---

**🌱 You've got this! Good luck with your TCC!**

---

**Quick Links:**
- 📖 Full Docs: [README.md](README.md)
- 🔧 Services Docs: [back-end-tcc/services/README.md](back-end-tcc/services/README.md)
- 📋 Quick Ref: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- 🎯 Changes Made: [MVP_REFACTORING.md](MVP_REFACTORING.md)
