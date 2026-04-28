"""
CrisisLink - Real-Time Emergency Coordination System
FastAPI Backend Entry Point
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.incidents import router as incidents_router
from routes.auth import router as auth_router

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("crisislink")

# Initialize FastAPI app
app = FastAPI(
    title="CrisisLink API",
    description="Real-time emergency coordination system for hotels",
    version="1.0.0",
)

# CORS — allow all origins for hackathon/frontend dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Tighten this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router, prefix="/api", tags=["Auth"])
app.include_router(incidents_router, prefix="/api", tags=["Incidents"])


@app.get("/", tags=["Health"])
def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "service": "CrisisLink API"}
