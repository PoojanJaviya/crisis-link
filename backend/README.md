# CrisisLink API 🚨

Real-time emergency coordination backend for hotels — built with **FastAPI + Firebase Firestore**.

---

## Project Structure

```
crisislink/
├── main.py              # FastAPI app, CORS, router mount
├── firebase_config.py   # Firebase Admin SDK init + get_db()
├── models.py            # Pydantic request/response models
├── routes/
│   ├── __init__.py
│   └── incidents.py     # All 3 incident endpoints
├── requirements.txt
├── .env.example
└── firebase_key.json    # ← YOU add this (never commit it)
```

---

## Setup

### 1. Get your Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project → **Project Settings** → **Service Accounts**
3. Click **"Generate new private key"** → download the JSON file
4. Rename it to `firebase_key.json` and place it in the project root

### 2. Create a Firestore Database

1. In Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in test mode"** (for hackathon)
3. Pick any region → Done

### 3. Install Dependencies

```bash
# Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install packages
pip install -r requirements.txt
```

### 4. Run the Server

```bash
uvicorn main:app --reload --port 8000
```

The API will be live at: `http://localhost:8000`  
Interactive docs (Swagger UI): `http://localhost:8000/docs`

---

## API Endpoints

### `POST /api/incident` — Create Incident (Guest)
```json
{
  "type": "fire",           // "fire" | "medical" | "security"
  "location": "Room 203",
  "description": "Smoke coming from bathroom"   // optional
}
```

### `GET /api/incidents` — Get All Incidents (Admin)
Returns all incidents sorted by newest first.

### `PATCH /api/incident/{id}` — Update Incident (Staff)
```json
{
  "status": "in-progress",      // optional
  "assigned_to": "John Staff"   // optional
}
```
At least one field required.

---

## Notes

- `firebase_key.json` is in `.gitignore` — never commit it
- CORS is open (`*`) for local frontend dev — restrict in production
- No authentication needed for this hackathon build
