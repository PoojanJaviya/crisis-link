"""
Incident routes for CrisisLink.

Endpoints:
  POST   /api/incident          → Guest creates a new incident
  GET    /api/incidents         → Admin views all incidents (latest first, optional ?status= filter)
  GET    /api/incident/{id}     → Fetch single incident by ID
  PATCH  /api/incident/{id}     → Staff updates status / assignment
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from firebase_config import get_db
from models import CreateIncidentRequest, UpdateIncidentRequest, IncidentResponse

logger = logging.getLogger("crisislink.routes")
router = APIRouter()

COLLECTION = "incidents"


# ── Helper ────────────────────────────────────────────────────────────────────

def _doc_to_incident(doc) -> IncidentResponse:
    """Convert Firestore document snapshot to IncidentResponse."""
    data = doc.to_dict()
    return IncidentResponse(
        id=doc.id,
        type=data.get("type"),
        location=data.get("location"),
        description=data.get("description"),
        status=data.get("status"),
        assigned_to=data.get("assigned_to"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


# ── POST /incident ────────────────────────────────────────────────────────────

@router.post("/incident", response_model=IncidentResponse, status_code=201)
def create_incident(body: CreateIncidentRequest):
    """Guest endpoint — report a new emergency."""
    db = get_db()
    now = datetime.now(timezone.utc)

    payload = {
        "type": body.type,
        "location": body.location,
        "description": body.description,
        "status": "pending",
        "assigned_to": None,
        "created_at": now,
        "updated_at": None,
    }

    _, doc_ref = db.collection(COLLECTION).add(payload)
    logger.info(f"Incident created: id={doc_ref.id} type={body.type}")
    return _doc_to_incident(doc_ref.get())


# ── GET /incidents ────────────────────────────────────────────────────────────

@router.get("/incidents", response_model=List[IncidentResponse])
def get_all_incidents(
    status: Optional[str] = Query(None, description="Filter by status: pending | in-progress | resolved")
):
    """Admin endpoint — all incidents, newest first. Optionally filter by ?status="""
    VALID_STATUSES = {"pending", "in-progress", "resolved"}

    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{status}'. Must be one of: {', '.join(VALID_STATUSES)}"
        )

    db = get_db()
    query = db.collection(COLLECTION).order_by("created_at", direction="DESCENDING")

    if status:
        query = query.where("status", "==", status)

    incidents = [_doc_to_incident(doc) for doc in query.stream()]
    logger.info(f"Fetched {len(incidents)} incident(s). Filter: status={status}")
    return incidents


# ── GET /incident/{id} ────────────────────────────────────────────────────────

@router.get("/incident/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str):
    """Fetch a single incident by ID."""
    db = get_db()
    snapshot = db.collection(COLLECTION).document(incident_id).get()

    if not snapshot.exists:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    return _doc_to_incident(snapshot)


# ── PATCH /incident/{id} ──────────────────────────────────────────────────────

@router.patch("/incident/{incident_id}", response_model=IncidentResponse)
def update_incident(incident_id: str, body: UpdateIncidentRequest):
    """Staff endpoint — update status and/or assigned_to."""
    if body.status is None and body.assigned_to is None:
        raise HTTPException(
            status_code=400,
            detail="Provide at least one field to update: 'status' or 'assigned_to'."
        )

    db = get_db()
    doc_ref = db.collection(COLLECTION).document(incident_id)

    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")

    updates = {"updated_at": datetime.now(timezone.utc)}
    if body.status is not None:
        updates["status"] = body.status
    if body.assigned_to is not None:
        updates["assigned_to"] = body.assigned_to

    doc_ref.update(updates)
    logger.info(f"Incident {incident_id} updated: {updates}")
    return _doc_to_incident(doc_ref.get())