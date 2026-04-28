# 🚨 CrisisLink — Complete Setup & Run Guide

> Real-Time Emergency Coordination System  
> Stack: **HTML/CSS/JS** (Frontend) + **FastAPI** (Backend) + **Firebase Firestore** (Database)

---

## 📋 Prerequisites

Make sure the following are installed on your machine before starting:

| Tool | Version | Check Command |
|------|---------|---------------|
| Python | 3.10 or higher | `python --version` |
| pip | Latest | `pip --version` |
| Node.js *(optional, only for Live Server alternative)* | Any LTS | `node --version` |

---

## 🗂️ Project Structure

```
crisis-link-main/
├── backend/                        ← FastAPI backend (Python)
│   ├── main.py                     ← App entry point
│   ├── firebase_config.py          ← Firebase SDK initialization
│   ├── models.py                   ← Pydantic request/response models
│   ├── routes/
│   │   └── incidents.py            ← All API endpoints
│   ├── requirements.txt            ← Python dependencies
│   ├── .env.example                ← Environment variable template
│   └── firebase_key.json           ← ⚠️ YOU MUST ADD THIS (see Step 1)
│
├── frontend/                       ← Static HTML/CSS/JS frontend
│   ├── index.html                  ← Home / Role selector
│   ├── guest.html                  ← Guest emergency report form
│   ├── staff.html                  ← Staff incident panel
│   ├── admin.html                  ← Admin command center
│   ├── css/
│   │   └── style.css               ← Full design system
│   └── js/
│       ├── api.js                  ← Centralized API helper
│       ├── guest.js                ← Guest page logic
│       ├── staff.js                ← Staff page logic
│       └── admin.js                ← Admin page logic
│
├── SETUP.md                        ← This file
└── project-goals.txt               ← Project overview
```

---

## ⚙️ STEP 1 — Firebase Setup (Database)

> Firebase Firestore is the database. You need a service account key to connect.

### 1A. Get your Firebase Service Account Key

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Select your project: **crisis-link-bd983** (or create a new one)
3. Click the ⚙️ gear icon → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **"Generate new private key"**
6. A `.json` file will download — this is your key

### 1B. Place the key file

> ⚠️ If you already have the key file in the root folder (e.g. `crisis-link-bd983-firebase-adminsdk-fbsvc-a0e22ae1d0.json`), just copy it.

**On Windows (PowerShell):**
```powershell
copy "d:\projects\Hackathon\my\crisis-link-bd983-firebase-adminsdk-fbsvc-a0e22ae1d0.json" `
     "d:\projects\Hackathon\my\crisis-link-main\backend\firebase_key.json"
```

**Or manually:**
- Copy/rename the downloaded file to exactly: `firebase_key.json`
- Place it inside the `backend/` folder

✅ Final result: `backend/firebase_key.json` should exist.

### 1C. Create the Firestore Database (if not already done)

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (allows open read/write for development)
3. Select any region → Click **Done**

---

## ⚙️ STEP 2 — Backend Setup (FastAPI)

Open a terminal and navigate to the backend folder:

```powershell
cd d:\projects\Hackathon\my\crisis-link-main\backend
```

### 2A. Create a Python Virtual Environment

```powershell
python -m venv venv
```

### 2B. Activate the Virtual Environment

```powershell
# Windows (PowerShell)
venv\Scripts\activate

# Windows (Command Prompt)
venv\Scripts\activate.bat

# macOS / Linux
source venv/bin/activate
```

> ✅ You should see `(venv)` appear at the start of your terminal prompt.

### 2C. Install Dependencies

```powershell
pip install -r requirements.txt
```

This installs:
- `fastapi` — Web framework
- `uvicorn` — ASGI server
- `firebase-admin` — Firebase/Firestore SDK
- `pydantic` — Data validation
- `python-dotenv` — Environment variable loading

### 2D. (Optional) Create a .env File

```powershell
copy .env.example .env
```

The default `.env` content is:
```
FIREBASE_KEY_PATH=firebase_key.json
```

You only need to change this if your key file has a different name or location.

---

## ▶️ STEP 3 — Run the Backend

Make sure you are inside `backend/` with the virtual environment **activated**, then run:

```powershell
uvicorn main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Firebase Admin SDK initialized successfully.
INFO:     Application startup complete.
```

### ✅ Verify the backend is running

Open your browser and visit:

| URL | What you see |
|-----|-------------|
| `http://localhost:8000` | `{"status":"ok","service":"CrisisLink API"}` |
| `http://localhost:8000/docs` | Interactive Swagger API documentation |
| `http://localhost:8000/api/incidents` | JSON list of all incidents (empty at first) |

> ⛔ If you see a Firebase error, make sure `firebase_key.json` exists in the `backend/` folder and is valid.

---

## ▶️ STEP 4 — Run the Frontend

> ⚠️ The frontend uses ES Modules (`type="module"` in script tags).  
> **You cannot just double-click the HTML files** — you must serve them via a local HTTP server.

### Option A — Python HTTP Server (Recommended, no install needed)

Open a **new terminal window** (keep the backend terminal running):

```powershell
cd d:\projects\Hackathon\my\crisis-link-main\frontend

python -m http.server 5500
```

Then open: **[http://localhost:5500](http://localhost:5500)**

### Option B — VS Code Live Server Extension

1. Install the **Live Server** extension in VS Code
2. Open `frontend/index.html` in VS Code
3. Right-click the file → **"Open with Live Server"**
4. It will auto-open at `http://127.0.0.1:5500`

### Option C — Node.js `serve` Package

```powershell
npx serve d:\projects\Hackathon\my\crisis-link-main\frontend -p 5500
```

---

## 🌐 STEP 5 — Use the Application

Once both servers are running, open your browser:

**👉 [http://localhost:5500](http://localhost:5500)**

### Application Pages

| Page | URL | Who uses it |
|------|-----|-------------|
| 🏠 Home | `http://localhost:5500/index.html` | Everyone — role selector landing page |
| 🆘 Guest | `http://localhost:5500/guest.html` | Guests — report Fire / Medical / Security emergencies |
| 👷 Staff | `http://localhost:5500/staff.html` | Staff — view active incidents, update status/assignment |
| 🛡️ Admin | `http://localhost:5500/admin.html` | Admins — full command center, analytics, all incidents |

### Workflow to Test

1. **Open `guest.html`** → Select "Fire" → Enter "Room 203" → Click "Report Emergency"
   - You'll see a success message with an Incident ID
2. **Open `staff.html`** → You'll see the new incident appear
   - Click "✏️ Update" → Set status to "In Progress" → Enter your name → Save
3. **Open `admin.html`** → See all incidents, stats, the donut chart, and activity feed
   - Use the filter tabs and search bar to find specific incidents
   - Click the ✏️ button on any row to edit it

---

## 🔁 Running Both Servers Together (Quick Reference)

### Terminal 1 — Backend

```powershell
cd d:\projects\Hackathon\my\crisis-link-main\backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Terminal 2 — Frontend

```powershell
cd d:\projects\Hackathon\my\crisis-link-main\frontend
python -m http.server 5500
```

---

## 🛠️ API Reference (Quick)

| Method | Endpoint | Who | Description |
|--------|----------|-----|-------------|
| `POST` | `/api/incident` | Guest | Create a new incident |
| `GET` | `/api/incidents` | Admin | Get all incidents (newest first) |
| `GET` | `/api/incidents?status=pending` | Staff | Filter by status |
| `GET` | `/api/incident/{id}` | Any | Get single incident |
| `PATCH` | `/api/incident/{id}` | Staff/Admin | Update status or assigned_to |

Full interactive docs: **[http://localhost:8000/docs](http://localhost:8000/docs)**

---

## ❌ Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `FileNotFoundError: firebase_key.json not found` | Key file missing | Copy it to `backend/firebase_key.json` |
| `ModuleNotFoundError: No module named 'fastapi'` | venv not activated or pip install not run | Run `venv\Scripts\activate` then `pip install -r requirements.txt` |
| `Cannot connect to server` (in frontend) | Backend not running | Start backend with `uvicorn main:app --reload --port 8000` |
| Frontend shows blank / JS doesn't load | Opened HTML directly (file://) | Use `python -m http.server 5500` instead |
| `CORS error` in browser console | Backend not running or wrong port | Make sure backend is on port 8000 |
| `google.api_core.exceptions.ServiceUnavailable` | Firestore not created yet | Create Firestore database in Firebase Console |

---

## 🔒 Security Notes (For Production)

- Change `allow_origins=["*"]` in `main.py` to your actual frontend domain
- Store `firebase_key.json` securely — never commit it to Git (already in `.gitignore`)
- Add authentication before deploying publicly

---

## 📞 Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5 + Vanilla CSS + Vanilla JS (ES Modules) |
| Backend | Python 3.10+ / FastAPI / Uvicorn |
| Database | Firebase Firestore (NoSQL, real-time) |
| Auth SDK | Firebase Admin SDK |
| Validation | Pydantic v2 |
| Fonts | Google Fonts — Inter |

---

*CrisisLink © 2025 — Built for Hackathon*
