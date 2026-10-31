# Context-Aware Smart Exit Reminder System

**Team:** Aryan Sali, Vinayak Patil, Prasad Patil
**Institution:** PCCOE Pune — B.Tech Computer Engineering Mini-Project
**Guides:** Prof. Shraddha Ovale, Prof. Prapti Kallawar

---

## What It Does

A smart doorway checkpoint that reminds you of forgotten items before you leave home. Items (keys, wallet, ID card, umbrella) carry passive UHF RFID tags. When a PIR motion sensor detects someone approaching the door, an ESP32 reads all nearby RFID tags and sends the list to a cloud backend. The backend compares scanned items against a user-defined required-items list and fires a spoken voice alert on the user's phone — *"Alert. Please remember your Keys and Umbrella."*

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Wokwi Simulation (ESP32)                                       │
│  PIR sensor → reads switch states → POST /device/scan           │
│  OLED shows result, buzzer beeps                                │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Render Backend (FastAPI + Python)                              │
│  - Authenticates device via device_key                         │
│  - Fetches user's active lists from MongoDB                     │
│  - Computes required ∪ active lists, missing = required − scanned│
│  - Saves scan event to MongoDB                                  │
│  - Returns {required, scanned, missing, alert, speech}          │
└──────────┬──────────────────────────────┬───────────────────────┘
           │ reads/writes                 │ reads
           ▼                             ▼
┌──────────────────────┐    ┌────────────────────────────────────┐
│  MongoDB Atlas       │    │  Mobile App (React Native / Expo)  │
│  Collections:        │    │  - Polls GET /me/latest every 2s   │
│  • users             │    │  - Dashboard updates live           │
│  • tags              │    │  - expo-speech fires voice alert    │
│  • lists             │    │  - Manage tags, lists, history      │
│  • events            │    │  - Auth via JWT                     │
└──────────────────────┘    └────────────────────────────────────┘
```

---

## Repository Structure

```
exit-reminder/
├── sketch_voice.ino          # ESP32 firmware (Wokwi simulation)
├── diagram.json              # Wokwi circuit diagram
├── mock_backend.py           # Original single-file backend (Stage 1, kept for reference)
├── CLAUDE.md                 # Project brief for AI assistant
├── README.md                 # This file
│
├── backend/                  # Stage 2 FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router registration
│   │   ├── config.py         # Env var loading (MONGO_URI, JWT_SECRET, etc.)
│   │   ├── database.py       # Motor async MongoDB connection
│   │   ├── auth.py           # JWT create/verify, bcrypt password hashing
│   │   ├── models.py         # Pydantic request/response models
│   │   ├── rule_engine.py    # compute_required(), make_speech()
│   │   └── routes/
│   │       ├── auth.py       # POST /auth/signup, /auth/login, GET /auth/me
│   │       ├── tags.py       # CRUD /tags
│   │       ├── lists.py      # CRUD /lists, add/remove tags from lists
│   │       ├── device.py     # POST /device/scan, GET /device/latest, GET /voice
│   │       └── me.py         # GET /me/latest, /me/history, /me/unregistered
│   ├── tests/                # pytest tests (mongomock)
│   ├── .env.example          # Environment variable template
│   └── pytest.ini
│
└── mobile/                   # React Native mobile app (Expo SDK 58)
    ├── app/
    │   ├── (auth)/
    │   │   ├── login.tsx     # Login screen
    │   │   └── signup.tsx    # Signup screen
    │   └── (tabs)/
    │       ├── dashboard.tsx # Live scan status, voice alert
    │       ├── tags.tsx      # Register and manage RFID tags
    │       ├── lists.tsx     # Create lists, add tags, toggle active
    │       ├── history.tsx   # Past scan events
    │       └── settings.tsx  # Device key, logout
    ├── utils/api.ts          # All API calls + TypeScript types
    └── .env.example          # EXPO_PUBLIC_BACKEND_URL
```

---

## Hardware Components (Real Deployment)

| Component | Role |
|---|---|
| ESP32 DevKit V1 | Edge microcontroller |
| YRM100 UHF RFID Reader | Reads passive EPC Gen2 tags (865–868 MHz) |
| PIR Motion Sensor | Detects person approaching door |
| SSD1306 OLED (128×64) | Displays missing items |
| MAX98357A I2S Amplifier + Speaker | Voice output (real hardware) |
| Passive UHF RFID Tags | Attached to keys, wallet, ID card, etc. |

**Note:** Hardware is not built. The system runs as a Wokwi simulation (see below).

---

## Wokwi Simulation

Since the real hardware is not built, a browser-based simulation runs on [wokwi.com](https://wokwi.com).

### What replaces what

| Real hardware | Simulation replacement |
|---|---|
| YRM100 UHF reader | 5 slide switches (LOW = tag present) |
| RFID tags on items | Each switch represents one tag |
| MAX98357A speaker | Browser `speechSynthesis` / `expo-speech` on phone |

### Simulated tag mapping

| Item | EPC | GPIO Pin |
|---|---|---|
| Wallet | `E200001122334455` | GPIO 13 |
| Keys | `E200AABBCCDDEEFF` | GPIO 12 |
| Umbrella | `E20011223344AABB` | GPIO 14 |
| ID Card | `E20022334455BBCC` | GPIO 26 |
| Laptop Bag | `E20033445566CCDD` | GPIO 33 |

Switch **ON** (LOW) = item is with the person. Switch **OFF** (HIGH via pull-up) = item is missing.

### Wiring summary

```
PIR sensor    → GPIO 27
Buzzer        → GPIO 25
OLED SDA      → GPIO 21
OLED SCL      → GPIO 22
Tag switches  → GPIO 13, 12, 14, 26, 33 (INPUT_PULLUP, LOW = detected)
```

---

## Backend API Reference

Base URL: `https://exit-reminder-system.onrender.com`

### Authentication (JWT)

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/auth/signup` | `{email, password}` | Create account, returns JWT |
| POST | `/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/auth/me` | — | Get current user info |

All other endpoints (except device endpoints) require `Authorization: Bearer <token>` header.

### Tags

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tags` | List all registered tags |
| POST | `/tags` | Register a new tag `{epc, name}` |
| PATCH | `/tags/{id}` | Rename a tag `{name}` |
| DELETE | `/tags/{id}` | Delete a tag (removed from all lists) |

### Lists

| Method | Endpoint | Description |
|---|---|---|
| GET | `/lists` | Get all lists with their tags |
| POST | `/lists` | Create a list `{name}` |
| PATCH | `/lists/{id}` | Update name or active state `{name?, active?}` |
| DELETE | `/lists/{id}` | Delete a list |
| POST | `/lists/{id}/tags` | Add a tag to a list `{tag_id}` |
| DELETE | `/lists/{id}/tags/{tag_id}` | Remove a tag from a list |

### Device (ESP32 — no JWT, uses device_key)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/device/scan` | Main scan endpoint `{device_key, scanned_epcs[]}` |
| POST | `/check` | Alias for `/device/scan` (backward compatible) |
| GET | `/device/latest?device_key=` | Latest scan result for voice page |
| GET | `/voice?device_key=` | Browser voice page |

### User data

| Method | Endpoint | Description |
|---|---|---|
| GET | `/me/latest` | Latest scan result (JWT auth) |
| GET | `/me/history` | Last 50 scan events |
| GET | `/me/unregistered` | EPCs seen but not yet registered |
| POST | `/me/device-key/regenerate` | Generate a new device key |
| GET | `/health` | Server health check |

### Scan request / response

**Request:**
```json
POST /device/scan
{
  "device_key": "a3f8c2d1e5b64f8a9c2d3e4f5a6b7c8d",
  "scanned_epcs": ["E200AABBCCDDEEFF", "E200001122334455"]
}
```

**Response:**
```json
{
  "required": ["Keys", "Umbrella", "Wallet"],
  "scanned": ["Keys", "Wallet"],
  "missing": ["Umbrella"],
  "alert": true,
  "speech": "Alert. Please remember your Umbrella.",
  "event_id": "64a3f8c2d1e5b64f8a9c2d3e"
}
```

---

## Rule Engine

File: `backend/app/rule_engine.py`

```
C_required = Union of all active lists' tag names
Missing     = C_required − Scanned_names
```

The backend finds all lists where `active = true` for the user, unions their item names, and subtracts what the ESP32 detected. A hook point exists for future weather and schedule rules.

---

## MongoDB Schema

### users
```json
{
  "_id": "ObjectId",
  "email": "string",
  "password_hash": "string (bcrypt)",
  "device_key": "string (32 hex chars)",
  "unregistered_epcs_seen": ["string"],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### tags
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "epc": "string",
  "name": "string",
  "created_at": "datetime"
}
```

### lists
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "name": "string",
  "active": "bool",
  "tag_ids": ["string"],
  "schedule": null,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### events
```json
{
  "_id": "ObjectId",
  "user_id": "string",
  "scanned_epcs": ["string"],
  "required_names": ["string"],
  "missing_names": ["string"],
  "alert": "bool",
  "speech": "string",
  "ts": "datetime"
}
```

---

## Setup Guide

### 1. Clone the repository

```bash
git clone https://github.com/aryan-sali0806/exit-reminder.git
cd exit-reminder
```

### 2. Backend — local development

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Copy and fill in env vars
copy .env.example .env

# Run locally
uvicorn backend.app.main:app --reload
```

`.env` file:
```
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/exit_reminder
MONGO_DB=exit_reminder
JWT_SECRET=your_long_random_secret_minimum_64_chars
JWT_EXPIRE_DAYS=7
```

### 3. Backend — deploy to Render

- Connect GitHub repo to Render
- Build command: *(leave empty)*
- Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- Root directory: *(leave empty — project root)*
- Set environment variables: `MONGO_URI`, `MONGO_DB`, `JWT_SECRET`, `JWT_EXPIRE_DAYS`

### 4. Mobile app

```bash
cd mobile
npm install --legacy-peer-deps

# Copy env file
copy .env.example .env.local
# Edit .env.local and set EXPO_PUBLIC_BACKEND_URL to your Render URL

# Start development server
npx expo start

# Scan QR code with Expo Go on Android
# Phone and laptop must be on the same WiFi network
```

### 5. ESP32 firmware (Wokwi)

1. Open [wokwi.com](https://wokwi.com) and create a new project
2. Upload `sketch_voice.ino` and `diagram.json`
3. In `sketch_voice.ino`, fill in:
   ```cpp
   const char* BACKEND_URL = "https://exit-reminder-system.onrender.com/device/scan";
   const char* DEVICE_KEY  = "your_device_key_from_app_settings";
   ```
4. The device key is shown in the mobile app under **Settings → Device Key**
5. Start the simulation and trigger the PIR sensor

---

## First-Time Setup in the App

1. Sign up with email and password
2. Go to **Tags tab** → tap **+** → register each tag (EPC + name)
3. Go to **Lists tab** → tap **+** → create a list (e.g. "College Day")
4. Tap **Add item** on the list → add your registered tags
5. Toggle the list **ON** (active)
6. Go to **Settings tab** → copy the **Device Key**
7. Paste the device key into `DEVICE_KEY` in `sketch_voice.ino`

---

## How Multiple Lists Work

Each list has an `active` flag. Before leaving, toggle the relevant list ON in the app. The backend compares scanned items against all currently active lists (union of their tags).

| Scenario | What to do |
|---|---|
| Going to college | Activate "College Day" list |
| Going to gym | Activate "Gym" list |
| Both lists active | All items from both lists become required |

There is no automatic destination detection in the current version. Schedule-based auto-activation is planned as future scope — the `schedule` field already exists on each list document as a hook for this.

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| Polling (2s) instead of WebSocket | Render free tier kills idle WebSocket connections after ~55s |
| Device key instead of JWT on ESP32 | ESP32 has no UI for login — a static key is the only practical option |
| MongoDB Atlas instead of local DB | Render free tier has ephemeral disk — all data would be lost on restart |
| Active flag on lists | Simpler than sending list_id in every scan — user sets context once before leaving |
| expo-speech for voice | No separate speaker hardware needed in simulation — phone speaks the alert |

---

## Known Limitations

- Hardware is not built — simulation validates software and data flow only, not RF reliability or real audio
- Render free tier sleeps after ~15 minutes of inactivity — cold start takes 30–60 seconds
- JWT tokens expire after 7 days — user must log in again after expiry
- Voice alert only works when the mobile app is open on the Dashboard tab (no background notifications yet)
- Manual tag EPC entry required in simulation — in real hardware, the YRM100 reader captures EPCs automatically on first scan
- `WiFiClientSecure.setInsecure()` used in sketch — skips TLS certificate verification (demo only, not for production)

---

## Future Scope

- **Firebase Cloud Messaging (FCM):** Push notifications so the alert reaches the phone even when the app is closed
- **Schedule-based list activation:** Auto-activate "College Day" at 8 AM on weekdays by reading the user's calendar
- **Weather integration:** Auto-add Umbrella to required list when rain is forecast
- **Real hardware build:** ESP32 + YRM100 UHF reader + MAX98357A speaker
- **EAS Build:** Convert Expo app to a standalone Android APK for distribution without Expo Go
- **ML-based personalization:** Learn which items the user forgets most often and prioritize alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Microcontroller firmware | Arduino C++ (ESP32) |
| Backend | Python 3.12, FastAPI, Motor (async MongoDB driver) |
| Database | MongoDB Atlas (free tier) |
| Mobile app | React Native, Expo SDK 58, TypeScript, expo-router |
| Auth | JWT (python-jose), bcrypt |
| Hosting | Render (free tier) |
| Simulation | Wokwi |
| Voice (simulation) | expo-speech (Android TTS) |
