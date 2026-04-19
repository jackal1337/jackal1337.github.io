from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from .config import Settings

SCHEMA = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS regions (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  alt TEXT,
  width INTEGER,
  height INTEGER,
  credit TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  excerpt TEXT,
  short_description TEXT,
  long_description TEXT,
  highlights_json TEXT NOT NULL DEFAULT '[]',
  tips_json TEXT NOT NULL DEFAULT '[]',
  warnings_json TEXT NOT NULL DEFAULT '[]',
  category_id TEXT REFERENCES categories(id),
  region_id TEXT REFERENCES regions(id),
  hero_image_id TEXT REFERENCES media(id),
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  author_id TEXT REFERENCES users(id),
  editor_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS place_tags (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (place_id, tag_id)
);

CREATE TABLE IF NOT EXISTS place_gallery (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES media(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (place_id, media_id)
);

CREATE TABLE IF NOT EXISTS place_related (
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  related_place_id TEXT NOT NULL REFERENCES places(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (place_id, related_place_id)
);

CREATE TABLE IF NOT EXISTS collection_places (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  place_id TEXT NOT NULL REFERENCES places(id),
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, place_id)
);

CREATE TABLE IF NOT EXISTS editorial_notes (
  id TEXT PRIMARY KEY,
  place_id TEXT NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT NOT NULL,
  author_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revisions (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  actor_id TEXT,
  created_at TEXT NOT NULL
);
"""


class Database:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.settings.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()
        if settings.allow_seed_on_startup:
            self.seed_if_empty()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.settings.database_path)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def seed_if_empty(self) -> None:
        with self.connect() as connection:
            row = connection.execute("SELECT COUNT(*) AS count FROM places").fetchone()
            if row and row["count"] > 0:
                return
        self.load_seed_file(self.settings.seed_path)

    def load_seed_file(self, seed_path: Path) -> None:
        payload = json.loads(seed_path.read_text(encoding="utf-8"))
        with self.connect() as connection:
            self._load_seed(connection, payload)
            connection.commit()

    def _load_seed(self, connection: sqlite3.Connection, payload: dict[str, Any]) -> None:
        cursor = connection.cursor()
        for table in (
            "collection_places",
            "place_related",
            "place_gallery",
            "place_tags",
            "editorial_notes",
            "revisions",
            "places",
            "collections",
            "media",
            "tags",
            "regions",
            "categories",
            "users",
            "settings",
        ):
            cursor.execute(f"DELETE FROM {table}")

        for key, value in payload.get("settings", {}).items():
            cursor.execute("INSERT INTO settings (key, value_json) VALUES (?, ?)", (key, json.dumps(value, ensure_ascii=False)))

        for user in payload.get("users", []):
            cursor.execute(
                """
                INSERT INTO users (id, display_name, email, role, status)
                VALUES (:id, :display_name, :email, :role, :status)
                """,
                user,
            )

        for table_name in ("categories", "regions", "tags"):
            for item in payload.get(table_name, []):
                cursor.execute(
                    f"""
                    INSERT INTO {table_name} (id, slug, title, description, sort_order)
                    VALUES (:id, :slug, :title, :description, :sort_order)
                    """,
                    item,
                )

        for item in payload.get("media", []):
            cursor.execute(
                """
                INSERT INTO media (id, kind, title, url, alt, width, height, credit)
                VALUES (:id, :kind, :title, :url, :alt, :width, :height, :credit)
                """,
                {**{"width": None, "height": None, "credit": None}, **item},
            )

        collections_by_slug: dict[str, str] = {}
        for item in payload.get("collections", []):
            cursor.execute(
                """
                INSERT INTO collections (id, slug, title, description, featured)
                VALUES (:id, :slug, :title, :description, :featured)
                """,
                {**item, "featured": 1 if item.get("featured") else 0},
            )
            collections_by_slug[item["slug"]] = item["id"]

        place_slug_to_id: dict[str, str] = {}
        for item in payload.get("places", []):
            cursor.execute(
                """
                INSERT INTO places (
                    id, slug, title, subtitle, excerpt, short_description, long_description,
                    highlights_json, tips_json, warnings_json, category_id, region_id,
                    hero_image_id, featured, status, author_id, editor_id,
                    created_at, updated_at, published_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["id"],
                    item["slug"],
                    item["title"],
                    item.get("subtitle"),
                    item.get("excerpt"),
                    item.get("short_description"),
                    item.get("long_description"),
                    json.dumps(item.get("highlights", []), ensure_ascii=False),
                    json.dumps(item.get("tips", []), ensure_ascii=False),
                    json.dumps(item.get("warnings", []), ensure_ascii=False),
                    item.get("category_id"),
                    item.get("region_id"),
                    item.get("hero_image_id"),
                    1 if item.get("featured") else 0,
                    item.get("status", "draft"),
                    item.get("author_id"),
                    item.get("editor_id"),
                    item.get("created_at"),
                    item.get("updated_at"),
                    item.get("published_at"),
                ),
            )
            place_slug_to_id[item["slug"]] = item["id"]

            for order, tag_id in enumerate(item.get("tag_ids", []), start=1):
                cursor.execute("INSERT INTO place_tags (place_id, tag_id) VALUES (?, ?)", (item["id"], tag_id))
            for order, media_id in enumerate(item.get("gallery_ids", []), start=1):
                cursor.execute(
                    "INSERT INTO place_gallery (place_id, media_id, sort_order) VALUES (?, ?, ?)",
                    (item["id"], media_id, order),
                )

        for item in payload.get("places", []):
            for order, related_slug in enumerate(item.get("related_place_slugs", []), start=1):
                related_id = place_slug_to_id.get(related_slug)
                if related_id:
                    cursor.execute(
                        "INSERT INTO place_related (place_id, related_place_id, sort_order) VALUES (?, ?, ?)",
                        (item["id"], related_id, order),
                    )

        for collection in payload.get("collections", []):
            for order, place_slug in enumerate(collection.get("place_slugs", []), start=1):
                place_id = place_slug_to_id.get(place_slug)
                if place_id:
                    cursor.execute(
                        "INSERT INTO collection_places (collection_id, place_id, sort_order) VALUES (?, ?, ?)",
                        (collection["id"], place_id, order),
                    )

        for note in payload.get("editorial_notes", []):
            place_id = place_slug_to_id.get(note["place_slug"])
            if place_id:
                cursor.execute(
                    """
                    INSERT INTO editorial_notes (id, place_id, status, note, author_id, created_at)
                    VALUES (:id, :place_id, :status, :note, :author_id, :created_at)
                    """,
                    {**note, "place_id": place_id},
                )
