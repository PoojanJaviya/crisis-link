"""
Seed script — populate the Firestore `users` collection with default accounts.

Run once:  python seed_users.py

Creates:
  - staff1  / staff123   (role: staff)
  - staff2  / staff123   (role: staff)
  - admin   / admin123   (role: admin)

Existing users with the same username are skipped (no overwrites).
"""

import sys
import os

# Ensure the backend directory is in the path so imports work
sys.path.insert(0, os.path.dirname(__file__))

from firebase_config import get_db
from auth_utils import hash_password

USERS = [
    {
        "username": "staff1",
        "password": "staff123",
        "role": "staff",
        "display_name": "Staff Member 1",
    },
    {
        "username": "staff2",
        "password": "staff123",
        "role": "staff",
        "display_name": "Staff Member 2",
    },
    {
        "username": "admin",
        "password": "admin123",
        "role": "admin",
        "display_name": "Administrator",
    },
]


def seed():
    db = get_db()
    users_ref = db.collection("users")

    for user in USERS:
        # Check if user already exists
        existing = users_ref.where("username", "==", user["username"]).limit(1).stream()
        if next(existing, None) is not None:
            print(f"  ⏭️  User '{user['username']}' already exists — skipping.")
            continue

        doc = {
            "username": user["username"],
            "password": hash_password(user["password"]),
            "role": user["role"],
            "display_name": user["display_name"],
        }
        users_ref.add(doc)
        print(f"  ✅ Created user '{user['username']}' (role={user['role']})")

    print("\n🎉 Seeding complete!")


if __name__ == "__main__":
    print("🌱 Seeding CrisisLink users into Firestore...\n")
    seed()
