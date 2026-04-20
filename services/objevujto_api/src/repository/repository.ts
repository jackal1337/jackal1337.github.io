import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';

import type { ObjevujToDatabase } from '../db/database.js';
import type { SeedPlace } from '../types/content.js';
import { slugify } from '../lib/slug.js';
import { utcNow } from '../lib/time.js';

function parseJsonList(value: string | null): string[] {
  return value ? (JSON.parse(value) as string[]) : [];
}

function mediaRef(row: any) {
  if (!row?.id && !row?.url) return null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    url: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    credit: row.credit,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export class Repository {
  constructor(private readonly database: ObjevujToDatabase) {}

  private get db(): Database.Database {
    return this.database.db;
  }

  getSetting<T>(key: string, fallback: T): T {
    const row = this.db.prepare('SELECT value_json FROM settings WHERE key = ?').get(key) as { value_json: string } | undefined;
    return row ? (JSON.parse(row.value_json) as T) : fallback;
  }

  listTaxonomy(table: 'categories' | 'regions' | 'tags') {
    return this.db.prepare(`SELECT id, slug, title, description, sort_order, created_at, updated_at FROM ${table} ORDER BY sort_order, title`).all();
  }

  listMedia() {
    return this.db.prepare('SELECT id, kind, title, url, alt, width, height, credit, created_at, updated_at FROM media ORDER BY title').all();
  }

  listUsers() {
    return this.db.prepare('SELECT id, display_name, email, role, status, created_at, updated_at FROM users ORDER BY display_name').all();
  }

  listCollections() {
    const rows = this.db.prepare('SELECT id, slug, title, description, featured, created_at, updated_at FROM collections ORDER BY featured DESC, title').all() as any[];
    return rows.map((row) => ({ ...row, featured: Boolean(row.featured), places: this.collectionPlaces(row.id) }));
  }

  private taxonomyById(table: 'categories' | 'regions' | 'tags', id?: string | null) {
    if (!id) return null;
    return this.db.prepare(`SELECT id, slug, title, description, sort_order, created_at, updated_at FROM ${table} WHERE id = ?`).get(id) ?? null;
  }

  private mediaById(id?: string | null) {
    if (!id) return null;
    const row = this.db.prepare('SELECT id, kind, title, url, alt, width, height, credit, created_at, updated_at FROM media WHERE id = ?').get(id) as any;
    return mediaRef(row);
  }

  private userById(id?: string | null) {
    if (!id) return null;
    return this.db.prepare('SELECT id, display_name, email, role, status, created_at, updated_at FROM users WHERE id = ?').get(id) ?? null;
  }

  private tagsForPlace(placeId: string) {
    return this.db.prepare(`SELECT tags.id, tags.slug, tags.title, tags.description, tags.sort_order, tags.created_at, tags.updated_at
      FROM place_tags JOIN tags ON tags.id = place_tags.tag_id WHERE place_tags.place_id = ? ORDER BY tags.sort_order, tags.title`).all(placeId);
  }

  private galleryForPlace(placeId: string) {
    const rows = this.db.prepare(`SELECT media.id, media.kind, media.title, media.url, media.alt, media.width, media.height, media.credit, media.created_at, media.updated_at
      FROM place_gallery JOIN media ON media.id = place_gallery.media_id WHERE place_gallery.place_id = ? ORDER BY place_gallery.sort_order`).all(placeId) as any[];
    return rows.map(mediaRef);
  }

  private relatedPlaces(placeId: string) {
    const rows = this.db.prepare(`SELECT places.id, places.slug, places.title, places.subtitle, places.excerpt, places.short_description,
      places.featured, places.status, places.updated_at,
      categories.id as category_id, categories.slug as category_slug, categories.title as category_title,
      regions.id as region_id, regions.slug as region_slug, regions.title as region_title,
      media.id as media_id, media.url as media_url, media.alt as media_alt
      FROM place_related JOIN places ON places.id = place_related.related_place_id
      LEFT JOIN categories ON categories.id = places.category_id
      LEFT JOIN regions ON regions.id = places.region_id
      LEFT JOIN media ON media.id = places.hero_image_id
      WHERE place_related.place_id = ? AND places.status = 'published'
      ORDER BY place_related.sort_order`).all(placeId) as any[];
    return rows.map((row) => this.summaryFromJoinedRow(row));
  }

  private editorialNotes(placeId: string) {
    return this.db.prepare('SELECT id, status, note, author_id, created_at FROM editorial_notes WHERE place_id = ? ORDER BY created_at DESC').all(placeId);
  }

  private summaryFromJoinedRow(row: any) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      excerpt: row.excerpt,
      short_description: row.short_description,
      featured: Boolean(row.featured),
      status: row.status,
      updated_at: row.updated_at,
      category: row.category_id ? { id: row.category_id, slug: row.category_slug, title: row.category_title } : null,
      region: row.region_id ? { id: row.region_id, slug: row.region_slug, title: row.region_title } : null,
      hero_image: row.media_id ? { id: row.media_id, url: row.media_url, alt: row.media_alt } : null,
      tags: this.tagsForPlace(row.id),
    };
  }

  listPlaces(filters: Record<string, string | boolean | undefined>, includeUnpublished: boolean, page = 1, limit = 12) {
    const params: unknown[] = [];
    const clauses: string[] = [];
    if (!includeUnpublished) {
      clauses.push("places.status = 'published'");
    } else if (filters.status) {
      clauses.push('places.status = ?');
      params.push(filters.status);
    }
    if (filters.region) {
      clauses.push('regions.slug = ?');
      params.push(filters.region);
    }
    if (filters.category) {
      clauses.push('categories.slug = ?');
      params.push(filters.category);
    }
    if (filters.tag) {
      clauses.push(`EXISTS (SELECT 1 FROM place_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.place_id = places.id AND t.slug = ?)`);
      params.push(filters.tag);
    }
    if (filters.q) {
      clauses.push(`(LOWER(places.title) LIKE ? OR LOWER(COALESCE(places.excerpt, '')) LIKE ? OR LOWER(COALESCE(places.short_description, '')) LIKE ?)`);
      const needle = `%${String(filters.q).toLowerCase()}%`;
      params.push(needle, needle, needle);
    }
    if (filters.featured === true) {
      clauses.push('places.featured = 1');
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const total = (this.db.prepare(`SELECT COUNT(*) as count FROM places LEFT JOIN categories ON categories.id = places.category_id LEFT JOIN regions ON regions.id = places.region_id ${where}`).get(...params) as { count: number }).count;
    const rows = this.db.prepare(`SELECT places.id, places.slug, places.title, places.subtitle, places.excerpt, places.short_description,
      places.featured, places.status, places.updated_at,
      categories.id as category_id, categories.slug as category_slug, categories.title as category_title,
      regions.id as region_id, regions.slug as region_slug, regions.title as region_title,
      media.id as media_id, media.url as media_url, media.alt as media_alt
      FROM places LEFT JOIN categories ON categories.id = places.category_id LEFT JOIN regions ON regions.id = places.region_id LEFT JOIN media ON media.id = places.hero_image_id
      ${where}
      ORDER BY places.featured DESC, places.updated_at DESC, places.title ASC
      LIMIT ? OFFSET ?`).all(...params, limit, (page - 1) * limit) as any[];

    return {
      items: rows.map((row) => this.summaryFromJoinedRow(row)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        region: filters.region ?? null,
        category: filters.category ?? null,
        tag: filters.tag ?? null,
        q: filters.q ?? null,
      },
    };
  }

  getPlaceById(placeId: string): any {
    const row = this.db.prepare('SELECT * FROM places WHERE id = ?').get(placeId) as any;
    return row ? this.hydratePlace(row) : null;
  }

  getPlaceBySlug(slug: string, includeUnpublished = false): any {
    const row = this.db.prepare(`SELECT * FROM places WHERE slug = ? ${includeUnpublished ? '' : "AND status = 'published'"}`).get(slug) as any;
    return row ? this.hydratePlace(row) : null;
  }

  hydratePlace(row: any): any {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      subtitle: row.subtitle,
      excerpt: row.excerpt,
      short_description: row.short_description,
      long_description: row.long_description,
      highlights: parseJsonList(row.highlights_json),
      tips: parseJsonList(row.tips_json),
      warnings: parseJsonList(row.warnings_json),
      category: this.taxonomyById('categories', row.category_id),
      region: this.taxonomyById('regions', row.region_id),
      tags: this.tagsForPlace(row.id),
      hero_image: this.mediaById(row.hero_image_id),
      gallery: this.galleryForPlace(row.id),
      related_places: this.relatedPlaces(row.id),
      featured: Boolean(row.featured),
      status: row.status,
      author: this.userById(row.author_id),
      editor: this.userById(row.editor_id),
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at,
      editorial_notes: this.editorialNotes(row.id),
    };
  }

  publicSitePayload() {
    const homepage = this.getSetting('homepage', {} as any);
    return {
      site: this.getSetting('site', {}),
      navigation: {
        featured_places: (homepage.featured_place_slugs || []).filter(Boolean),
        featured_collections: (homepage.featured_collection_slugs || []).filter(Boolean),
      },
      homepage: {
        ...homepage,
        featured_places: this.listPlaces({ featured: true }, false, 1, 6).items,
        featured_collections: this.listCollections().filter((item: any) => item.featured),
        featured_regions: this.listTaxonomy('regions').filter((item: any) => (homepage.featured_region_slugs || []).includes(item.slug)),
      },
    };
  }

  publicPlacePayload(slug: string, publicBaseUrl: string) {
    const item = this.getPlaceBySlug(slug, false);
    if (!item) return null;
    const breadcrumbs = [{ title: 'Domů', href: `${publicBaseUrl}/` }];
    if (item.region) {
      breadcrumbs.push({ title: item.region.title, href: `${publicBaseUrl}/places.html?region=${item.region.slug}` });
    }
    breadcrumbs.push({ title: item.title, href: `${publicBaseUrl}/place.html?slug=${item.slug}` });
    return { item, related: item.related_places, breadcrumbs };
  }

  dashboardSummary() {
    return {
      counts: {
        places: (this.db.prepare('SELECT COUNT(*) as count FROM places').get() as any).count,
        media: (this.db.prepare('SELECT COUNT(*) as count FROM media').get() as any).count,
        categories: (this.db.prepare('SELECT COUNT(*) as count FROM categories').get() as any).count,
        regions: (this.db.prepare('SELECT COUNT(*) as count FROM regions').get() as any).count,
        tags: (this.db.prepare('SELECT COUNT(*) as count FROM tags').get() as any).count,
      },
      status_breakdown: this.db.prepare('SELECT status, COUNT(*) as count FROM places GROUP BY status ORDER BY status').all(),
      recent_revisions: this.db.prepare('SELECT id, entity_type, entity_id, action, actor_id, created_at FROM revisions ORDER BY created_at DESC LIMIT 10').all(),
    };
  }

  listAdminPlaces() {
    return this.listPlaces({}, true, 1, 100).items;
  }

  private writeRevision(entityType: string, entityId: string, action: string, snapshot: unknown, actorId?: string | null) {
    this.db.prepare('INSERT INTO revisions (id, entity_type, entity_id, action, snapshot_json, actor_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(`rev_${randomUUID().slice(0, 12)}`, entityType, entityId, action, JSON.stringify(snapshot), actorId ?? null, utcNow());
  }

  private upsertRelations(placeId: string, payload: SeedPlace) {
    this.db.prepare('DELETE FROM place_tags WHERE place_id = ?').run(placeId);
    this.db.prepare('DELETE FROM place_gallery WHERE place_id = ?').run(placeId);
    this.db.prepare('DELETE FROM place_related WHERE place_id = ?').run(placeId);
    for (const tagId of payload.tag_ids ?? []) {
      this.db.prepare('INSERT INTO place_tags (place_id, tag_id) VALUES (?, ?)').run(placeId, tagId);
    }
    (payload.gallery_ids ?? []).forEach((mediaId, index) => {
      this.db.prepare('INSERT INTO place_gallery (place_id, media_id, sort_order) VALUES (?, ?, ?)').run(placeId, mediaId, index + 1);
    });
    (payload.related_place_slugs ?? []).forEach((slug, index) => {
      const related = this.db.prepare('SELECT id FROM places WHERE slug = ?').get(slug) as { id: string } | undefined;
      if (related) {
        this.db.prepare('INSERT INTO place_related (place_id, related_place_id, sort_order) VALUES (?, ?, ?)').run(placeId, related.id, index + 1);
      }
    });
  }

  createPlace(payload: Partial<SeedPlace>, actorId?: string | null) {
    const now = utcNow();
    const item: SeedPlace = {
      id: payload.id || `place_${randomUUID().slice(0, 10)}`,
      slug: payload.slug || slugify(payload.title || 'untitled-place'),
      title: payload.title || 'Untitled place',
      subtitle: payload.subtitle ?? null,
      excerpt: payload.excerpt ?? null,
      short_description: payload.short_description ?? null,
      long_description: payload.long_description ?? null,
      highlights: payload.highlights ?? [],
      tips: payload.tips ?? [],
      warnings: payload.warnings ?? [],
      category_id: payload.category_id ?? null,
      region_id: payload.region_id ?? null,
      tag_ids: payload.tag_ids ?? [],
      hero_image_id: payload.hero_image_id ?? null,
      gallery_ids: payload.gallery_ids ?? [],
      related_place_slugs: payload.related_place_slugs ?? [],
      featured: payload.featured ?? false,
      status: payload.status || 'draft',
      author_id: payload.author_id ?? null,
      editor_id: payload.editor_id ?? null,
      created_at: payload.created_at || now,
      updated_at: now,
      published_at: payload.status === 'published' ? payload.published_at || now : payload.published_at ?? null,
    };
    const tx = this.db.transaction(() => {
      this.db.prepare(`INSERT INTO places (
        id, slug, title, subtitle, excerpt, short_description, long_description,
        highlights_json, tips_json, warnings_json, category_id, region_id, hero_image_id,
        featured, status, author_id, editor_id, created_at, updated_at, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(item.id, item.slug, item.title, item.subtitle, item.excerpt, item.short_description, item.long_description, JSON.stringify(item.highlights), JSON.stringify(item.tips), JSON.stringify(item.warnings), item.category_id, item.region_id, item.hero_image_id, item.featured ? 1 : 0, item.status, item.author_id, item.editor_id, item.created_at, item.updated_at, item.published_at);
      this.upsertRelations(item.id, item);
      this.writeRevision('place', item.id, 'created', this.getPlaceById(item.id), actorId);
    });
    tx();
    return this.getPlaceById(item.id);
  }

  updatePlace(placeId: string, payload: Partial<SeedPlace>, actorId?: string | null) {
    const existing = this.getPlaceById(placeId);
    if (!existing) return null;
    const now = utcNow();
    const item: SeedPlace = {
      id: placeId,
      slug: payload.slug || existing.slug,
      title: payload.title || existing.title,
      subtitle: payload.subtitle ?? existing.subtitle,
      excerpt: payload.excerpt ?? existing.excerpt,
      short_description: payload.short_description ?? existing.short_description,
      long_description: payload.long_description ?? existing.long_description,
      highlights: payload.highlights ?? existing.highlights,
      tips: payload.tips ?? existing.tips,
      warnings: payload.warnings ?? existing.warnings,
      category_id: payload.category_id ?? existing.category?.id ?? null,
      region_id: payload.region_id ?? existing.region?.id ?? null,
      tag_ids: payload.tag_ids ?? existing.tags.map((tag: any) => tag.id),
      hero_image_id: payload.hero_image_id ?? existing.hero_image?.id ?? null,
      gallery_ids: payload.gallery_ids ?? existing.gallery.map((media: any) => media.id),
      related_place_slugs: payload.related_place_slugs ?? existing.related_places.map((place: any) => place.slug),
      featured: payload.featured ?? existing.featured,
      status: payload.status || existing.status,
      author_id: payload.author_id ?? existing.author?.id ?? null,
      editor_id: payload.editor_id ?? existing.editor?.id ?? null,
      created_at: existing.created_at,
      updated_at: now,
      published_at: payload.status === 'published' ? existing.published_at || now : existing.published_at,
    };

    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE places SET
        slug = ?, title = ?, subtitle = ?, excerpt = ?, short_description = ?, long_description = ?,
        highlights_json = ?, tips_json = ?, warnings_json = ?, category_id = ?, region_id = ?, hero_image_id = ?,
        featured = ?, status = ?, author_id = ?, editor_id = ?, updated_at = ?, published_at = ?
        WHERE id = ?`)
        .run(item.slug, item.title, item.subtitle, item.excerpt, item.short_description, item.long_description, JSON.stringify(item.highlights), JSON.stringify(item.tips), JSON.stringify(item.warnings), item.category_id, item.region_id, item.hero_image_id, item.featured ? 1 : 0, item.status, item.author_id, item.editor_id, item.updated_at, item.published_at ?? null, placeId);
      this.upsertRelations(placeId, item);
      this.writeRevision('place', placeId, 'updated', this.getPlaceById(placeId), actorId);
    });
    tx();
    return this.getPlaceById(placeId);
  }

  publishPlace(placeId: string, actorId?: string | null) {
    const item = this.getPlaceById(placeId);
    if (!item) return null;
    const now = utcNow();
    this.db.prepare(`UPDATE places SET status = 'published', updated_at = ?, published_at = COALESCE(published_at, ?) WHERE id = ?`).run(now, now, placeId);
    const updated = this.getPlaceById(placeId);
    this.writeRevision('place', placeId, 'published', updated, actorId);
    return updated;
  }

  placeRevisions(placeId: string) {
    return this.db.prepare('SELECT id, entity_type, entity_id, action, actor_id, created_at, snapshot_json FROM revisions WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC')
      .all('place', placeId)
      .map((row: any) => ({ ...row, snapshot: JSON.parse(row.snapshot_json) }));
  }

  createTaxonomy(table: 'categories' | 'regions' | 'tags', payload: { title: string; slug?: string; description?: string | null; sort_order?: number }) {
    const id = `${table.slice(0, -1)}_${randomUUID().slice(0, 10)}`;
    this.db.prepare(`INSERT INTO ${table} (id, slug, title, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, payload.slug || slugify(payload.title), payload.title, payload.description ?? null, payload.sort_order ?? 0, utcNow(), utcNow());
    return this.db.prepare(`SELECT id, slug, title, description, sort_order, created_at, updated_at FROM ${table} WHERE id = ?`).get(id);
  }

  createMedia(payload: { title: string; url: string; alt?: string | null; kind?: string }) {
    const id = `media_${randomUUID().slice(0, 10)}`;
    this.db.prepare('INSERT INTO media (id, kind, title, url, alt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, payload.kind || 'image', payload.title, payload.url, payload.alt ?? null, utcNow(), utcNow());
    return this.db.prepare('SELECT id, kind, title, url, alt, width, height, credit, created_at, updated_at FROM media WHERE id = ?').get(id);
  }

  collectionPlaces(collectionId: string) {
    const rows = this.db.prepare(`SELECT places.id, places.slug, places.title, places.subtitle, places.excerpt, places.short_description,
      places.featured, places.status, places.updated_at,
      categories.id as category_id, categories.slug as category_slug, categories.title as category_title,
      regions.id as region_id, regions.slug as region_slug, regions.title as region_title,
      media.id as media_id, media.url as media_url, media.alt as media_alt
      FROM collection_places JOIN places ON places.id = collection_places.place_id
      LEFT JOIN categories ON categories.id = places.category_id LEFT JOIN regions ON regions.id = places.region_id LEFT JOIN media ON media.id = places.hero_image_id
      WHERE collection_places.collection_id = ? AND places.status = 'published' ORDER BY collection_places.sort_order`).all(collectionId) as any[];
    return rows.map((row) => this.summaryFromJoinedRow(row));
  }
}
