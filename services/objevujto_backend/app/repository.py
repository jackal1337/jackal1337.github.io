from __future__ import annotations

import json
import re
import unicodedata
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Iterable

from .database import Database


def utc_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or f"item-{uuid.uuid4().hex[:8]}"


@dataclass(slots=True)
class Pagination:
    page: int
    limit: int
    total: int

    @property
    def pages(self) -> int:
        if self.limit <= 0:
            return 0
        return (self.total + self.limit - 1) // self.limit

    def as_dict(self) -> dict[str, int]:
        return {"page": self.page, "limit": self.limit, "total": self.total, "pages": self.pages}


class Repository:
    def __init__(self, database: Database) -> None:
        self.database = database

    def get_setting(self, key: str, default: Any = None) -> Any:
        with self.database.connect() as connection:
            row = connection.execute("SELECT value_json FROM settings WHERE key = ?", (key,)).fetchone()
            if not row:
                return default
            return json.loads(row["value_json"])

    def list_taxonomy(self, table_name: str) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                f"SELECT id, slug, title, description, sort_order, created_at, updated_at FROM {table_name} ORDER BY sort_order, title"
            ).fetchall()
            return [dict(row) for row in rows]

    def list_media(self) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT id, kind, title, url, alt, width, height, credit, created_at, updated_at FROM media ORDER BY title"
            ).fetchall()
            return [dict(row) for row in rows]

    def list_users(self) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT id, display_name, email, role, status, created_at, updated_at FROM users ORDER BY display_name"
            ).fetchall()
            return [dict(row) for row in rows]

    def get_public_site_payload(self) -> dict[str, Any]:
        site = self.get_setting("site", {})
        homepage = self.get_setting("homepage", {})
        featured_places = self.list_places({"featured": True}, include_unpublished=False, limit=6)["items"]
        collections = [item for item in self.list_collections() if item.get("featured")]
        collection_lookup = {item["slug"]: item for item in collections}
        featured_collections = [
            collection_lookup[slug]
            for slug in homepage.get("featured_collection_slugs", [])
            if slug in collection_lookup
        ]
        regions = self.list_taxonomy("regions")
        region_lookup = {item["slug"]: item for item in regions}
        featured_regions = [
            region_lookup[slug]
            for slug in homepage.get("featured_region_slugs", [])
            if slug in region_lookup
        ]
        return {
            "site": site,
            "navigation": {
                "featured_places": [item["slug"] for item in featured_places],
                "featured_collections": [item["slug"] for item in featured_collections],
            },
            "homepage": {
                **homepage,
                "featured_places": featured_places,
                "featured_collections": featured_collections,
                "featured_regions": featured_regions,
            },
        }

    def list_collections(self) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT id, slug, title, description, featured, created_at, updated_at FROM collections ORDER BY featured DESC, title"
            ).fetchall()
            result = []
            for row in rows:
                item = dict(row)
                item["featured"] = bool(item["featured"])
                item["places"] = self._collection_places(connection, row["id"])
                result.append(item)
            return result

    def list_places(
        self,
        filters: dict[str, Any] | None = None,
        *,
        include_unpublished: bool,
        page: int = 1,
        limit: int = 12,
    ) -> dict[str, Any]:
        filters = filters or {}
        page = max(page, 1)
        limit = max(min(limit, 50), 1)
        conditions: list[str] = []
        params: list[Any] = []

        if not include_unpublished:
            conditions.append("places.status = 'published'")
        elif filters.get("status"):
            conditions.append("places.status = ?")
            params.append(filters["status"])

        if filters.get("region"):
            conditions.append("regions.slug = ?")
            params.append(filters["region"])
        if filters.get("category"):
            conditions.append("categories.slug = ?")
            params.append(filters["category"])
        if filters.get("featured") is True:
            conditions.append("places.featured = 1")
        if filters.get("tag"):
            conditions.append(
                "EXISTS (SELECT 1 FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = places.id AND t.slug = ?)"
            )
            params.append(filters["tag"])
        if filters.get("q"):
            needle = f"%{str(filters['q']).strip().lower()}%"
            conditions.append(
                "(LOWER(places.title) LIKE ? OR LOWER(COALESCE(places.excerpt, '')) LIKE ? OR LOWER(COALESCE(places.short_description, '')) LIKE ?)"
            )
            params.extend([needle, needle, needle])

        where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
        with self.database.connect() as connection:
            total = connection.execute(
                f"""
                SELECT COUNT(*) AS count
                FROM places
                LEFT JOIN categories ON categories.id = places.category_id
                LEFT JOIN regions ON regions.id = places.region_id
                {where_sql}
                """,
                params,
            ).fetchone()["count"]
            rows = connection.execute(
                f"""
                SELECT
                  places.id,
                  places.slug,
                  places.title,
                  places.subtitle,
                  places.excerpt,
                  places.short_description,
                  places.featured,
                  places.status,
                  places.updated_at,
                  categories.slug AS category_slug,
                  categories.title AS category_title,
                  regions.slug AS region_slug,
                  regions.title AS region_title,
                  media.id AS hero_media_id,
                  media.url AS hero_url,
                  media.alt AS hero_alt
                FROM places
                LEFT JOIN categories ON categories.id = places.category_id
                LEFT JOIN regions ON regions.id = places.region_id
                LEFT JOIN media ON media.id = places.hero_image_id
                {where_sql}
                ORDER BY places.featured DESC, places.updated_at DESC, places.title ASC
                LIMIT ? OFFSET ?
                """,
                [*params, limit, (page - 1) * limit],
            ).fetchall()
            items = [self._place_summary_from_row(connection, row) for row in rows]
            return {
                "items": items,
                "pagination": Pagination(page=page, limit=limit, total=total).as_dict(),
                "filters": {
                    "region": filters.get("region"),
                    "category": filters.get("category"),
                    "tag": filters.get("tag"),
                    "q": filters.get("q"),
                },
            }

    def get_place_by_slug(self, slug: str, *, include_unpublished: bool = False) -> dict[str, Any] | None:
        with self.database.connect() as connection:
            condition = "" if include_unpublished else "AND places.status = 'published'"
            row = connection.execute(
                f"""
                SELECT places.*
                FROM places
                WHERE places.slug = ? {condition}
                LIMIT 1
                """,
                (slug,),
            ).fetchone()
            if not row:
                return None
            return self._hydrate_place(connection, row)

    def get_place_by_id(self, place_id: str) -> dict[str, Any] | None:
        with self.database.connect() as connection:
            row = connection.execute("SELECT * FROM places WHERE id = ? LIMIT 1", (place_id,)).fetchone()
            if not row:
                return None
            return self._hydrate_place(connection, row)

    def public_place_payload(self, slug: str, public_base_url: str) -> dict[str, Any] | None:
        item = self.get_place_by_slug(slug, include_unpublished=False)
        if not item:
            return None
        breadcrumbs = [
            {"title": "Domů", "href": f"{public_base_url}/"},
        ]
        if item.get("region"):
            breadcrumbs.append(
                {
                    "title": item["region"]["title"],
                    "href": f"{public_base_url}/places.html?region={item['region']['slug']}",
                }
            )
        breadcrumbs.append(
            {
                "title": item["title"],
                "href": f"{public_base_url}/place.html?slug={item['slug']}",
            }
        )
        return {
            "item": item,
            "related": item["related_places"],
            "breadcrumbs": breadcrumbs,
        }

    def dashboard_summary(self) -> dict[str, Any]:
        with self.database.connect() as connection:
            status_rows = connection.execute(
                "SELECT status, COUNT(*) AS count FROM places GROUP BY status ORDER BY status"
            ).fetchall()
            recent_revisions = connection.execute(
                "SELECT id, entity_type, entity_id, action, actor_id, created_at FROM revisions ORDER BY created_at DESC LIMIT 10"
            ).fetchall()
            return {
                "counts": {
                    "places": connection.execute("SELECT COUNT(*) AS count FROM places").fetchone()["count"],
                    "media": connection.execute("SELECT COUNT(*) AS count FROM media").fetchone()["count"],
                    "categories": connection.execute("SELECT COUNT(*) AS count FROM categories").fetchone()["count"],
                    "regions": connection.execute("SELECT COUNT(*) AS count FROM regions").fetchone()["count"],
                    "tags": connection.execute("SELECT COUNT(*) AS count FROM tags").fetchone()["count"],
                },
                "status_breakdown": [dict(row) for row in status_rows],
                "recent_revisions": [dict(row) for row in recent_revisions],
            }

    def list_admin_places(self) -> list[dict[str, Any]]:
        return self.list_places({}, include_unpublished=True, page=1, limit=100)["items"]

    def create_place(self, payload: dict[str, Any], actor_id: str | None) -> dict[str, Any]:
        place_id = payload.get("id") or f"place_{uuid.uuid4().hex[:10]}"
        slug = payload.get("slug") or slugify(payload.get("title", ""))
        now = utc_now()
        data = self._normalize_place_payload(payload, place_id=place_id, slug=slug, now=now, created_at=payload.get("created_at") or now)
        with self.database.connect() as connection:
            self._upsert_place(connection, data, replace=False)
            self._write_revision(connection, entity_type="place", entity_id=place_id, action="created", snapshot=self._hydrate_place(connection, connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone()), actor_id=actor_id)
            connection.commit()
        return self.get_place_by_id(place_id)  # type: ignore[return-value]

    def update_place(self, place_id: str, payload: dict[str, Any], actor_id: str | None) -> dict[str, Any] | None:
        existing = self.get_place_by_id(place_id)
        if not existing:
            return None
        slug = payload.get("slug") or existing["slug"]
        now = utc_now()
        merged = {
            **existing,
            **payload,
            "tag_ids": payload.get("tag_ids", [item["id"] for item in existing.get("tags", [])]),
            "gallery_ids": payload.get("gallery_ids", [item["id"] for item in existing.get("gallery", [])]),
            "related_place_slugs": payload.get("related_place_slugs", [item["slug"] for item in existing.get("related_places", [])]),
            "category_id": payload.get("category_id") or existing.get("category", {}).get("id"),
            "region_id": payload.get("region_id") or existing.get("region", {}).get("id"),
            "hero_image_id": payload.get("hero_image_id") or existing.get("hero_image", {}).get("id"),
            "author_id": payload.get("author_id") or existing.get("author", {}).get("id"),
            "editor_id": payload.get("editor_id") or existing.get("editor", {}).get("id"),
            "created_at": existing.get("created_at"),
        }
        data = self._normalize_place_payload(merged, place_id=place_id, slug=slug, now=now, created_at=existing.get("created_at") or now)
        with self.database.connect() as connection:
            self._upsert_place(connection, data, replace=True)
            snapshot = self._hydrate_place(connection, connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone())
            self._write_revision(connection, entity_type="place", entity_id=place_id, action="updated", snapshot=snapshot, actor_id=actor_id)
            connection.commit()
        return self.get_place_by_id(place_id)

    def publish_place(self, place_id: str, actor_id: str | None) -> dict[str, Any] | None:
        item = self.get_place_by_id(place_id)
        if not item:
            return None
        now = utc_now()
        with self.database.connect() as connection:
            connection.execute(
                "UPDATE places SET status = 'published', published_at = ?, updated_at = ? WHERE id = ?",
                (now, now, place_id),
            )
            snapshot = self._hydrate_place(connection, connection.execute("SELECT * FROM places WHERE id = ?", (place_id,)).fetchone())
            self._write_revision(connection, entity_type="place", entity_id=place_id, action="published", snapshot=snapshot, actor_id=actor_id)
            connection.commit()
        return self.get_place_by_id(place_id)

    def list_place_revisions(self, place_id: str) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(
                "SELECT id, entity_type, entity_id, action, actor_id, created_at, snapshot_json FROM revisions WHERE entity_type = 'place' AND entity_id = ? ORDER BY created_at DESC",
                (place_id,),
            ).fetchall()
            return [{**dict(row), "snapshot": json.loads(row["snapshot_json"])} for row in rows]

    def create_taxonomy(self, table_name: str, payload: dict[str, Any]) -> dict[str, Any]:
        item_id = payload.get("id") or f"{table_name[:-1]}_{uuid.uuid4().hex[:10]}"
        slug = payload.get("slug") or slugify(payload.get("title", ""))
        with self.database.connect() as connection:
            connection.execute(
                f"INSERT INTO {table_name} (id, slug, title, description, sort_order) VALUES (?, ?, ?, ?, ?)",
                (item_id, slug, payload.get("title"), payload.get("description"), int(payload.get("sort_order", 0))),
            )
            connection.commit()
        return next(item for item in self.list_taxonomy(table_name) if item["id"] == item_id)

    def create_media(self, payload: dict[str, Any]) -> dict[str, Any]:
        media_id = payload.get("id") or f"media_{uuid.uuid4().hex[:10]}"
        with self.database.connect() as connection:
            connection.execute(
                """
                INSERT INTO media (id, kind, title, url, alt, width, height, credit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    media_id,
                    payload.get("kind", "image"),
                    payload.get("title"),
                    payload.get("url"),
                    payload.get("alt"),
                    payload.get("width"),
                    payload.get("height"),
                    payload.get("credit"),
                    utc_now(),
                    utc_now(),
                ),
            )
            connection.commit()
        return next(item for item in self.list_media() if item["id"] == media_id)

    def _normalize_place_payload(self, payload: dict[str, Any], *, place_id: str, slug: str, now: str, created_at: str) -> dict[str, Any]:
        status = payload.get("status") or "draft"
        published_at = payload.get("published_at")
        if status == "published" and not published_at:
            published_at = now
        return {
            "id": place_id,
            "slug": slug,
            "title": payload.get("title", ""),
            "subtitle": payload.get("subtitle"),
            "excerpt": payload.get("excerpt"),
            "short_description": payload.get("short_description"),
            "long_description": payload.get("long_description"),
            "highlights": list(payload.get("highlights") or []),
            "tips": list(payload.get("tips") or []),
            "warnings": list(payload.get("warnings") or []),
            "category_id": payload.get("category_id"),
            "region_id": payload.get("region_id"),
            "tag_ids": list(payload.get("tag_ids") or []),
            "hero_image_id": payload.get("hero_image_id"),
            "gallery_ids": list(payload.get("gallery_ids") or []),
            "related_place_slugs": list(payload.get("related_place_slugs") or []),
            "featured": bool(payload.get("featured")),
            "status": status,
            "author_id": payload.get("author_id"),
            "editor_id": payload.get("editor_id"),
            "created_at": created_at,
            "updated_at": now,
            "published_at": published_at,
        }

    def _upsert_place(self, connection, data: dict[str, Any], *, replace: bool) -> None:
        if replace:
            connection.execute(
                """
                UPDATE places SET
                    slug = ?,
                    title = ?,
                    subtitle = ?,
                    excerpt = ?,
                    short_description = ?,
                    long_description = ?,
                    highlights_json = ?,
                    tips_json = ?,
                    warnings_json = ?,
                    category_id = ?,
                    region_id = ?,
                    hero_image_id = ?,
                    featured = ?,
                    status = ?,
                    author_id = ?,
                    editor_id = ?,
                    created_at = ?,
                    updated_at = ?,
                    published_at = ?
                WHERE id = ?
                """,
                (
                    data["slug"],
                    data["title"],
                    data.get("subtitle"),
                    data.get("excerpt"),
                    data.get("short_description"),
                    data.get("long_description"),
                    json.dumps(data.get("highlights", []), ensure_ascii=False),
                    json.dumps(data.get("tips", []), ensure_ascii=False),
                    json.dumps(data.get("warnings", []), ensure_ascii=False),
                    data.get("category_id"),
                    data.get("region_id"),
                    data.get("hero_image_id"),
                    1 if data.get("featured") else 0,
                    data.get("status"),
                    data.get("author_id"),
                    data.get("editor_id"),
                    data.get("created_at"),
                    data.get("updated_at"),
                    data.get("published_at"),
                    data["id"],
                ),
            )
            connection.execute("DELETE FROM place_tags WHERE place_id = ?", (data["id"],))
            connection.execute("DELETE FROM place_gallery WHERE place_id = ?", (data["id"],))
            connection.execute("DELETE FROM place_related WHERE place_id = ?", (data["id"],))
        else:
            connection.execute(
                """
                INSERT INTO places (
                    id, slug, title, subtitle, excerpt, short_description, long_description,
                    highlights_json, tips_json, warnings_json, category_id, region_id,
                    hero_image_id, featured, status, author_id, editor_id, created_at, updated_at, published_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    data["id"],
                    data["slug"],
                    data["title"],
                    data.get("subtitle"),
                    data.get("excerpt"),
                    data.get("short_description"),
                    data.get("long_description"),
                    json.dumps(data.get("highlights", []), ensure_ascii=False),
                    json.dumps(data.get("tips", []), ensure_ascii=False),
                    json.dumps(data.get("warnings", []), ensure_ascii=False),
                    data.get("category_id"),
                    data.get("region_id"),
                    data.get("hero_image_id"),
                    1 if data.get("featured") else 0,
                    data.get("status"),
                    data.get("author_id"),
                    data.get("editor_id"),
                    data.get("created_at"),
                    data.get("updated_at"),
                    data.get("published_at"),
                ),
            )
        for tag_id in data.get("tag_ids", []):
            connection.execute("INSERT INTO place_tags (place_id, tag_id) VALUES (?, ?)", (data["id"], tag_id))
        for index, media_id in enumerate(data.get("gallery_ids", []), start=1):
            connection.execute(
                "INSERT INTO place_gallery (place_id, media_id, sort_order) VALUES (?, ?, ?)",
                (data["id"], media_id, index),
            )
        for index, related_slug in enumerate(data.get("related_place_slugs", []), start=1):
            related_row = connection.execute("SELECT id FROM places WHERE slug = ?", (related_slug,)).fetchone()
            if related_row:
                connection.execute(
                    "INSERT INTO place_related (place_id, related_place_id, sort_order) VALUES (?, ?, ?)",
                    (data["id"], related_row["id"], index),
                )

    def _write_revision(self, connection, *, entity_type: str, entity_id: str, action: str, snapshot: dict[str, Any], actor_id: str | None) -> None:
        connection.execute(
            "INSERT INTO revisions (id, entity_type, entity_id, action, snapshot_json, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                f"rev_{uuid.uuid4().hex[:12]}",
                entity_type,
                entity_id,
                action,
                json.dumps(snapshot, ensure_ascii=False),
                actor_id,
                utc_now(),
            ),
        )

    def _collection_places(self, connection, collection_id: str) -> list[dict[str, Any]]:
        rows = connection.execute(
            """
            SELECT places.id, places.slug, places.title, places.subtitle, places.excerpt, places.short_description,
                   places.featured, places.status, places.updated_at,
                   categories.slug AS category_slug, categories.title AS category_title,
                   regions.slug AS region_slug, regions.title AS region_title,
                   media.id AS hero_media_id, media.url AS hero_url, media.alt AS hero_alt
            FROM collection_places
            JOIN places ON places.id = collection_places.place_id
            LEFT JOIN categories ON categories.id = places.category_id
            LEFT JOIN regions ON regions.id = places.region_id
            LEFT JOIN media ON media.id = places.hero_image_id
            WHERE collection_places.collection_id = ?
            ORDER BY collection_places.sort_order ASC
            """,
            (collection_id,),
        ).fetchall()
        return [self._place_summary_from_row(connection, row) for row in rows if row["status"] == "published"]

    def _place_summary_from_row(self, connection, row) -> dict[str, Any]:
        item = {
            "id": row["id"],
            "slug": row["slug"],
            "title": row["title"],
            "subtitle": row["subtitle"],
            "excerpt": row["excerpt"],
            "short_description": row["short_description"],
            "featured": bool(row["featured"]),
            "status": row["status"],
            "updated_at": row["updated_at"],
            "category": self._taxonomy_ref(row["category_slug"], row["category_title"], connection, "categories"),
            "region": self._taxonomy_ref(row["region_slug"], row["region_title"], connection, "regions"),
            "hero_image": self._media_ref(row["hero_media_id"], row["hero_url"], row["hero_alt"]),
            "tags": self._tags_for_place(connection, row["id"]),
        }
        return item

    def _hydrate_place(self, connection, row) -> dict[str, Any]:
        category = self._lookup_taxonomy_by_id(connection, "categories", row["category_id"])
        region = self._lookup_taxonomy_by_id(connection, "regions", row["region_id"])
        hero_image = self._lookup_media_by_id(connection, row["hero_image_id"])
        author = self._lookup_user_by_id(connection, row["author_id"])
        editor = self._lookup_user_by_id(connection, row["editor_id"])
        tags = self._tags_for_place(connection, row["id"])
        gallery = self._gallery_for_place(connection, row["id"])
        related_places = self._related_places(connection, row["id"])
        return {
            "id": row["id"],
            "slug": row["slug"],
            "title": row["title"],
            "subtitle": row["subtitle"],
            "excerpt": row["excerpt"],
            "short_description": row["short_description"],
            "long_description": row["long_description"],
            "highlights": json.loads(row["highlights_json"] or "[]"),
            "tips": json.loads(row["tips_json"] or "[]"),
            "warnings": json.loads(row["warnings_json"] or "[]"),
            "category": category,
            "region": region,
            "tags": tags,
            "hero_image": hero_image,
            "gallery": gallery,
            "related_places": related_places,
            "featured": bool(row["featured"]),
            "status": row["status"],
            "author": author,
            "editor": editor,
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "published_at": row["published_at"],
            "editorial_notes": self._editorial_notes(connection, row["id"]),
        }

    def _taxonomy_ref(self, slug: str | None, title: str | None, connection, table_name: str) -> dict[str, Any] | None:
        if not slug:
            return None
        row = connection.execute(
            f"SELECT id, slug, title, description, sort_order, created_at, updated_at FROM {table_name} WHERE slug = ?",
            (slug,),
        ).fetchone()
        return dict(row) if row else None

    def _lookup_taxonomy_by_id(self, connection, table_name: str, item_id: str | None) -> dict[str, Any] | None:
        if not item_id:
            return None
        row = connection.execute(
            f"SELECT id, slug, title, description, sort_order, created_at, updated_at FROM {table_name} WHERE id = ?",
            (item_id,),
        ).fetchone()
        return dict(row) if row else None

    def _media_ref(self, media_id: str | None, media_url: str | None, media_alt: str | None) -> dict[str, Any] | None:
        if not media_id and not media_url:
            return None
        return {"id": media_id, "url": media_url, "alt": media_alt}

    def _lookup_media_by_id(self, connection, media_id: str | None) -> dict[str, Any] | None:
        if not media_id:
            return None
        row = connection.execute(
            "SELECT id, kind, title, url, alt, width, height, credit, created_at, updated_at FROM media WHERE id = ?",
            (media_id,),
        ).fetchone()
        return dict(row) if row else None

    def _lookup_user_by_id(self, connection, user_id: str | None) -> dict[str, Any] | None:
        if not user_id:
            return None
        row = connection.execute(
            "SELECT id, display_name, email, role, status, created_at, updated_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return dict(row) if row else None

    def _tags_for_place(self, connection, place_id: str) -> list[dict[str, Any]]:
        rows = connection.execute(
            """
            SELECT tags.id, tags.slug, tags.title, tags.description, tags.sort_order, tags.created_at, tags.updated_at
            FROM place_tags
            JOIN tags ON tags.id = place_tags.tag_id
            WHERE place_tags.place_id = ?
            ORDER BY tags.sort_order, tags.title
            """,
            (place_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def _gallery_for_place(self, connection, place_id: str) -> list[dict[str, Any]]:
        rows = connection.execute(
            """
            SELECT media.id, media.kind, media.title, media.url, media.alt, media.width, media.height, media.credit, media.created_at, media.updated_at
            FROM place_gallery
            JOIN media ON media.id = place_gallery.media_id
            WHERE place_gallery.place_id = ?
            ORDER BY place_gallery.sort_order ASC
            """,
            (place_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def _related_places(self, connection, place_id: str) -> list[dict[str, Any]]:
        rows = connection.execute(
            """
            SELECT places.id, places.slug, places.title, places.subtitle, places.excerpt, places.short_description,
                   places.featured, places.status, places.updated_at,
                   categories.slug AS category_slug, categories.title AS category_title,
                   regions.slug AS region_slug, regions.title AS region_title,
                   media.id AS hero_media_id, media.url AS hero_url, media.alt AS hero_alt
            FROM place_related
            JOIN places ON places.id = place_related.related_place_id
            LEFT JOIN categories ON categories.id = places.category_id
            LEFT JOIN regions ON regions.id = places.region_id
            LEFT JOIN media ON media.id = places.hero_image_id
            WHERE place_related.place_id = ? AND places.status = 'published'
            ORDER BY place_related.sort_order ASC
            """,
            (place_id,),
        ).fetchall()
        return [self._place_summary_from_row(connection, row) for row in rows]

    def _editorial_notes(self, connection, place_id: str) -> list[dict[str, Any]]:
        rows = connection.execute(
            "SELECT id, status, note, author_id, created_at FROM editorial_notes WHERE place_id = ? ORDER BY created_at DESC",
            (place_id,),
        ).fetchall()
        return [dict(row) for row in rows]
