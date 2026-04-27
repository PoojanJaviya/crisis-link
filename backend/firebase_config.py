"""
Firebase / Firestore connection module.

Initializes the Firebase Admin SDK once using a service account key file.
The `get_db()` helper returns the Firestore client for use across the app.
"""

import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger("crisislink.firebase")

# Path to your downloaded Firebase service account JSON key.
# Override with FIREBASE_KEY_PATH env var, or place the file at the default path.
_KEY_PATH = os.getenv("FIREBASE_KEY_PATH", "firebase_key.json")


def _initialize_app() -> None:
    """Initialize Firebase Admin SDK (only once per process)."""
    if firebase_admin._apps:
        return  # Already initialized

    if not os.path.exists(_KEY_PATH):
        raise FileNotFoundError(
            f"Firebase service account key not found at '{_KEY_PATH}'. "
            "Download it from Firebase Console → Project Settings → Service Accounts "
            "and place it in the project root (or set FIREBASE_KEY_PATH env var)."
        )

    cred = credentials.Certificate(_KEY_PATH)
    firebase_admin.initialize_app(cred)
    logger.info("Firebase Admin SDK initialized successfully.")


# Initialize on import
_initialize_app()


def get_db() -> firestore.Client:
    """Return the Firestore database client."""
    return firestore.client()
