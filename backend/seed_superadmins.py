"""
seed_superadmins.py – Creates exactly 2 superadmin accounts.

Usage:
    python seed_superadmins.py

Requires DATABASE_URL in backend/.env
"""

import sys
import os

# Add backend root to path so we can import our modules
sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv
load_dotenv()

from database import get_db
from utils.auth import hash_password

SUPERADMINS = [
    {
        "username": "Admin One",
        "email": "admin1@iqoo-platform.com",
        "password": "Admin@1234!",
    },
    {
        "username": "Admin Two",
        "email": "admin2@iqoo-platform.com",
        "password": "Admin@5678!",
    },
]


def seed():
    print("🌱  Seeding superadmin accounts...\n")
    for admin in SUPERADMINS:
        try:
            with get_db() as cur:
                cur.execute(
                    "SELECT id FROM platform_superadmins WHERE email = %s",
                    (admin["email"],),
                )
                if cur.fetchone():
                    print(f"⚠️   Skipping {admin['email']} – already exists.")
                    continue

                pw_hash = hash_password(admin["password"])
                cur.execute(
                    """
                    INSERT INTO platform_superadmins
                        (username, email, password_hash, role, is_active)
                    VALUES (%s, %s, %s, 'superadmin', true)
                    """,
                    (admin["username"], admin["email"], pw_hash),
                )
                print(f"✅   Created: {admin['email']}")
        except Exception as exc:
            print(f"❌   Failed for {admin['email']}: {exc}")

    print("\n🎉  Seed complete!")
    print("─" * 44)
    for a in SUPERADMINS:
        print(f"  Email:    {a['email']}")
        print(f"  Password: {a['password']}")
        print("─" * 44)


if __name__ == "__main__":
    seed()
