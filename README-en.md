# 🌱 Eco Mais - Smart Recycling Bin System

**Green-Tech Startup Project** | Triple Validation System (User + Weight + AI Vision)

---

## 📋 Project Overview

Eco Mais is a smart recycling system that combines **ESP32-CAM hardware**, **AI-powered vision classification**, and **gamified rewards** to incentivize proper waste segregation. The system uses triple validation to prevent point injection fraud:

1. **👤 User Session**: QR code scan with 3-minute timeout
2. **⚖️ Weight Validation**: Load cell sensor ensures realistic weights
3. **🤖 AI Vision**: The Backend runs a YOLOv8 model on the image sent by the ESP32-CAM to classify materials and ensure they match the reported weight and category.

---

## 🏗️ Architecture Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: MariaDB / MySQL with SQLAlchemy ORM
- **Hardware**: ESP32-CAM + Load Cell Sensor
- **Computer Vision**: YOLOv8 (Ultralytics) + OpenCV for recyclable material classification
- **Authentication**: JWT tokens + HMAC-SHA256 hardware signatures
- **Background Tasks**: FastAPI BackgroundTasks (native, no Redis/Celery for MVP)
- **Storage**: Local filesystem (AWS S3 for production)

---

## 📁 Project Structure

```
eco_mais/
├── back-end-tcc/          # FastAPI API, services, models, and tests
├── front-end-tcc/         # Expo/React Native application
├── firmware/              # ESP32 code
├── docs/                  # Shared diagrams and documentation
├── skills/                # Skills and generated documentation
└── ARCHITECTURE.md        # Complete system architecture guide
```

---

## 🚀 Quick Start

### 1. Prerequisites

- Python 3.11+
- MariaDB 10.6+ or MySQL 8.0+
- ESP32-CAM hardware (for production)

### 2. Installation

```bash
# Clone the repository
cd Eco_Mais
cd back-end-tcc

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env

# Edit .env with your database credentials
nano .env
```

### 3. Database Setup

```bash
# Create MariaDB database
mysql -u root -p
CREATE DATABASE eco_mais_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'eco_mais_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON eco_mais_db.* TO 'eco_mais_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# Initialize database tables
python database.py

# Or use Alembic for migrations (recommended for production)
alembic init migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### 4. Seed Material Data

```python
# Create scripts/seed_materials.py
from database import SessionLocal
from models import Material, MaterialCategory

db = SessionLocal()

materials = [
    Material(name="PET Plastic", category=MaterialCategory.PLASTIC,
             points_per_kg=120, ai_class_name="plastic_pet"),
    Material(name="Glass Bottle", category=MaterialCategory.GLASS,
             points_per_kg=80, ai_class_name="glass_clear"),
    Material(name="Aluminum Can", category=MaterialCategory.METAL,
             points_per_kg=200, ai_class_name="metal_aluminum"),
    Material(name="Cardboard", category=MaterialCategory.PAPER,
             points_per_kg=50, ai_class_name="paper_cardboard"),
]

db.add_all(materials)
db.commit()
print("✓ Seeded materials successfully!")
```

### 5. Run Development Server

```bash
# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Access API documentation
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)

# Test health check
curl http://localhost:8000/health
```

**Note:** For MVP, background tasks run using FastAPI's native BackgroundTasks. For production scale, consider migrating to Celery + Redis.

---

## 🔐 Security Architecture

### ESP32 ↔ Backend Handshake

The ESP32 authenticates using HMAC-SHA256 signatures:

```cpp
// ESP32 Code (C++)
String timestamp = String(now());
String message = BIN_ID + timestamp + jsonPayload;
String signature = hmac_sha256(HARDWARE_API_KEY, message);

httpClient.addHeader("X-Bin-ID", "BIN_001");
httpClient.addHeader("X-Timestamp", timestamp);
httpClient.addHeader("X-Signature", signature);
httpClient.POST("/v1/bin/upload", jsonPayload);
```

**Backend verifies**:

1. Timestamp within ±5 minutes (prevents replay attacks)
2. Bin exists and is active
3. HMAC signature matches expected value
4. All requests logged in `audit_logs` table

See `ARCHITECTURE.md` for detailed security flows.

---

## 🛡️ Triple Validation Flow

```
User Scans QR → Session Created (3min timeout)
                     ↓
User Deposits Item → Weight Measured (Load Cell)
                     ↓
ESP32-CAM Captures → Upload to /v1/bin/upload (200 OK returned immediately)
                     ↓
Background AI Processing → Classification (YOLOv8)
                     ↓
All 3 Valid? → Points Awarded → User Notified
```

**Background Processing (MVP):**

- AI classification runs in FastAPI BackgroundTasks
- ESP32 receives immediate 200 OK response (no waiting)
- Points awarded asynchronously after AI completes
- For production scale: migrate to Celery + Redis

**Anti-Fraud Mechanisms**:

- Rate limiting (10 discards/session, 100/day)
- Duplicate image detection (perceptual hashing) _[MVP: Placeholder]_
- Weight anomaly detection (ML outlier detection) _[MVP: Placeholder]_
- Session timeout enforcement (checked on each request)
- Manual review queue for low-confidence classifications _[Future]_

---

## 📊 Database Schema

### Key Tables

**Users**: Account management, points tracking
**SmartBins**: Hardware registry, API keys, location
**ActiveSessions**: 3-minute recycling windows
**Materials**: Recyclable material catalog, points rates
**Discards**: Triple validation records, fraud flags
**Rewards**: Points transaction ledger
**AuditLog**: Security event logging

See `models.py` for complete schema with relationships.

---

## 🤖 AI Model Integration

### Training Your Model

```python
# 1. Collect labeled dataset
#    - 10,000+ images per material category
#    - Varied lighting, angles, backgrounds
#    - Annotate in YOLO format (bounding boxes)

# 2. Train YOLOv8 classification model
from ultralytics import YOLO

# Load pretrained model
model = YOLO('yolov8n-cls.pt')  # Nano model for speed

# Train on your dataset
results = model.train(
    data='path/to/dataset',
    epochs=100,
    imgsz=224,
    batch=16
)

# Save model
model.save('ml/models/recyclable_classifier.pt')

# 3. Export for deployment (optional)
model.export(format='onnx')  # For production optimization
```

### Expected Material Classes

```python
CLASSES = [
    "plastic_pet", "plastic_hdpe",
    "glass_clear", "glass_colored",
    "paper_cardboard", "paper_newspaper",
    "metal_aluminum", "metal_steel",
    "organic", "electronic", "non_recyclable"
]
```

---

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=. --cov-report=html

# Test specific modules
pytest tests/test_validation.py -v
pytest tests/test_security.py -v
```

---

## 📱 API Endpoints

### Implemented Endpoints ✅

- `GET /health` - System health check
- `POST /v1/bin/upload` - ⭐ **ESP32 Triple Validation Endpoint**
- `POST /v1/bin/heartbeat` - Bin status reporting

### To Be Implemented

#### Public Endpoints

- `POST /v1/auth/register` - User registration
- `POST /v1/auth/login` - JWT authentication
- `GET /v1/materials` - List recyclable materials

#### User Endpoints (JWT required)

- `POST /v1/sessions/start` - Start recycling session (QR scan)
- `GET /v1/users/me` - Get user profile and points
- `GET /v1/discards/history` - User's recycling history

#### Admin Endpoints

- `GET /v1/admin/bins` - Manage smart bins
- `GET /v1/admin/flagged-discards` - Review suspicious activity

---

## 🎯 Next Steps

### Phase 1: Backend Development

- [x] ✅ Implement `/v1/bin/upload` endpoint with BackgroundTasks
- [x] ✅ Implement triple validation service
- [ ] Build session management endpoints (`/v1/sessions/start`)
- [ ] Create user authentication (JWT)
- [ ] Implement user endpoints (`/v1/users/me`, history)

### Phase 2: ESP32 Firmware

- [ ] Implement HMAC signature generation
- [ ] Integrate camera capture
- [ ] Connect load cell weight sensor
- [ ] Add retry logic for failed uploads

### Phase 3: AI Model

- [ ] Collect training dataset (10k+ images)
- [ ] Train YOLOv8 classifier (yolov8n-cls or yolov8s-cls)
- [ ] Achieve >85% accuracy on validation set
- [ ] Deploy model on backend (FastAPI serves inference)

### Phase 4: Mobile App

- [ ] QR code scanner (session start)
- [ ] Real-time points display
- [ ] Discard history and stats
- [ ] Leaderboard

### Phase 5: Admin Dashboard

- [ ] Bin monitoring dashboard
- [ ] Fraud detection review queue
- [ ] Analytics (recycling patterns, user engagement)

---

## 📖 Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system design, security flows, validation logic
- **[models.py](back-end-tcc/models.py)** - SQLAlchemy database models with relationships
- **[config.py](back-end-tcc/config.py)** - Environment configuration reference

---

## 🤝 Contributing

This is a TCC (undergraduate thesis) project. Contributions welcome!

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👤 Author

**Paulo Eduardo** - Green-Tech Startup (TCC Project)

---

## 🙏 Acknowledgments

- FastAPI framework
- SQLAlchemy ORM
- Ultralytics YOLOv8
- OpenCV community
- ESP32 open-source ecosystem

---

**Built with 💚 for a sustainable future**
