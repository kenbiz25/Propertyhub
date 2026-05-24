"""Firebase Admin SDK initialisation — Firestore + Storage."""

from __future__ import annotations

import json
import os
from functools import lru_cache

import firebase_admin
from firebase_admin import credentials, firestore, storage


# ── Initialisation ─────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def get_app() -> firebase_admin.App:
    """Initialise and return the Firebase Admin app (singleton)."""
    if firebase_admin._apps:                         # already initialised
        return firebase_admin.get_app()

    bucket = os.environ["FIREBASE_STORAGE_BUCKET"]

    # Prefer inline JSON (CI / cloud) over file path (local dev)
    inline_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if inline_json:
        cred = credentials.Certificate(json.loads(inline_json))
    else:
        path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")
        cred = credentials.Certificate(path)

    return firebase_admin.initialize_app(cred, {"storageBucket": bucket})


def get_db() -> firestore.client:
    get_app()
    return firestore.client()


def get_bucket():
    get_app()
    return storage.bucket()


# ── Firestore helpers ──────────────────────────────────────────────────────────

def source_url_exists(source_url: str) -> bool:
    """Return True if a document with this source_url already exists."""
    db = get_db()
    docs = (
        db.collection("properties")
        .where(filter=firestore.FieldFilter("source_url", "==", source_url))
        .limit(1)
        .stream()
    )
    return any(True for _ in docs)


def count_scraped_today() -> int:
    """Count properties saved by the scraper today (UTC date).

    Queries only by agent_id (auto-indexed) then filters by date in Python
    to avoid needing a composite Firestore index.
    """
    import datetime

    db = get_db()
    agent_id = os.environ.get("SCRAPER_AGENT_ID", "scraper_bot")
    today_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

    docs = (
        db.collection("properties")
        .where(filter=firestore.FieldFilter("agent_id", "==", agent_id))
        .stream()
    )

    count = 0
    for doc in docs:
        data = doc.to_dict() or {}
        created = data.get("created_at")
        if created is None:
            continue
        # created_at is a Firestore Timestamp; convert to UTC date string
        if hasattr(created, "strftime"):
            doc_date = created.strftime("%Y-%m-%d")
        else:
            # Firestore Timestamp object
            doc_date = created.ToDatetime().strftime("%Y-%m-%d")
        if doc_date == today_str:
            count += 1
    return count


def save_property_document(data: dict) -> str:
    """Write to Firestore, return the new document ID."""
    from google.cloud.firestore_v1 import SERVER_TIMESTAMP

    db = get_db()
    data["created_at"] = SERVER_TIMESTAMP
    data["updated_at"] = SERVER_TIMESTAMP
    ref = db.collection("properties").document()
    ref.set(data)
    return ref.id


# ── Storage helpers ────────────────────────────────────────────────────────────

def upload_image_bytes(
    image_bytes: bytes,
    agent_id: str,
    property_id: str,
    index: int,
    content_type: str = "image/jpeg",
) -> str:
    """Upload image bytes to Firebase Storage and return the public download URL."""
    bucket = get_bucket()
    ext = "jpg" if "jpeg" in content_type or "jpg" in content_type else "png"
    blob_path = f"properties/{agent_id}/{property_id}/img_{index}.{ext}"
    blob = bucket.blob(blob_path)
    blob.upload_from_string(image_bytes, content_type=content_type)
    blob.make_public()
    return blob.public_url
