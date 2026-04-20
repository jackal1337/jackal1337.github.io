import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { utcNow } from '../lib/time.js';
import type { Settings } from '../config/settings.js';
import type { SeedPayload } from '../types/content.js';
import { SCHEMA_SQL } from './schema.js';

export class ObjevujToDatabase {
  readonly db: Database.Database;

  constructor(private readonly settings: Settings) {
    fs.mkdirSync(path.dirname(settings.dbPath), { recursive: true });
    this.db = new Database(settings.dbPath);
    this.db.pragma('foreign_keys = ON');
    this.db.exec(SCHEMA_SQL);
    if (settings.allowSeedOnStartup) {
      this.seedIfEmpty();
      this.ensureAuthIdentitiesSeeded();
    }
  }

  close(): void {
    this.db.close();
  }

  ensureAuthIdentitiesSeeded(): void {
    const payload = JSON.parse(fs.readFileSync(this.settings.seedPath, 'utf8')) as SeedPayload;
    const identities = payload.auth_identities || [];
    if (!identities.length) return;
    const count = this.db.prepare('SELECT COUNT(*) as count FROM auth_identities').get() as { count: number };
    if (count.count > 0) return;

    const stamp = utcNow();
    const tx = this.db.transaction(() => {
      for (const identity of identities) {
        this.db.prepare('INSERT OR IGNORE INTO auth_identities (id, provider, external_id, user_id, role_override, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(identity.id, identity.provider, identity.external_id, identity.user_id, identity.role_override ?? null, stamp, stamp);
      }
    });
    tx();
  }

  seedIfEmpty(): void {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM places').get() as { count: number };
    if (count.count > 0) return;
    const payload = JSON.parse(fs.readFileSync(this.settings.seedPath, 'utf8')) as SeedPayload;
    this.loadSeed(payload);
  }

  loadSeed(payload: SeedPayload): void {
    const run = this.db.transaction(() => {
      for (const table of ['collection_places', 'place_related', 'place_gallery', 'place_tags', 'editorial_notes', 'revisions', 'places', 'collections', 'media', 'auth_identities', 'tags', 'regions', 'categories', 'users', 'settings']) {
        this.db.prepare(`DELETE FROM ${table}`).run();
      }

      for (const [key, value] of Object.entries(payload.settings || {})) {
        this.db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run(key, JSON.stringify(value));
      }

      const stamp = utcNow();
      for (const user of payload.users || []) {
        this.db.prepare(`INSERT INTO users (id, display_name, email, role, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(user.id, user.display_name, user.email ?? null, user.role, user.status, stamp, stamp);
      }

      for (const identity of payload.auth_identities || []) {
        this.db.prepare(`INSERT INTO auth_identities (id, provider, external_id, user_id, role_override, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(identity.id, identity.provider, identity.external_id, identity.user_id, identity.role_override ?? null, stamp, stamp);
      }

      for (const [table, items] of [['categories', payload.categories], ['regions', payload.regions], ['tags', payload.tags]] as const) {
        for (const item of items || []) {
          this.db.prepare(`INSERT INTO ${table} (id, slug, title, description, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(item.id, item.slug, item.title, item.description ?? null, item.sort_order ?? 0, stamp, stamp);
        }
      }

      for (const item of payload.media || []) {
        this.db.prepare(`INSERT INTO media (id, kind, title, url, alt, width, height, credit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(item.id, item.kind, item.title, item.url, item.alt ?? null, item.width ?? null, item.height ?? null, item.credit ?? null, stamp, stamp);
      }

      for (const item of payload.collections || []) {
        this.db.prepare(`INSERT INTO collections (id, slug, title, description, featured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
          .run(item.id, item.slug, item.title, item.description ?? null, item.featured ? 1 : 0, stamp, stamp);
      }

      const placeSlugToId = new Map<string, string>();
      for (const item of payload.places || []) {
        this.db.prepare(`INSERT INTO places (
          id, slug, title, subtitle, excerpt, short_description, long_description,
          highlights_json, tips_json, warnings_json, category_id, region_id, hero_image_id,
          featured, status, author_id, editor_id, created_at, updated_at, published_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
            item.id,
            item.slug,
            item.title,
            item.subtitle ?? null,
            item.excerpt ?? null,
            item.short_description ?? null,
            item.long_description ?? null,
            JSON.stringify(item.highlights ?? []),
            JSON.stringify(item.tips ?? []),
            JSON.stringify(item.warnings ?? []),
            item.category_id ?? null,
            item.region_id ?? null,
            item.hero_image_id ?? null,
            item.featured ? 1 : 0,
            item.status,
            item.author_id ?? null,
            item.editor_id ?? null,
            item.created_at,
            item.updated_at,
            item.published_at ?? null,
          );
        placeSlugToId.set(item.slug, item.id);

        for (const tagId of item.tag_ids ?? []) {
          this.db.prepare('INSERT INTO place_tags (place_id, tag_id) VALUES (?, ?)').run(item.id, tagId);
        }
        (item.gallery_ids ?? []).forEach((mediaId, index) => {
          this.db.prepare('INSERT INTO place_gallery (place_id, media_id, sort_order) VALUES (?, ?, ?)').run(item.id, mediaId, index + 1);
        });
      }

      for (const item of payload.places || []) {
        (item.related_place_slugs ?? []).forEach((slug, index) => {
          const relatedId = placeSlugToId.get(slug);
          if (relatedId) {
            this.db.prepare('INSERT INTO place_related (place_id, related_place_id, sort_order) VALUES (?, ?, ?)').run(item.id, relatedId, index + 1);
          }
        });
      }

      for (const item of payload.collections || []) {
        item.place_slugs.forEach((slug, index) => {
          const placeId = placeSlugToId.get(slug);
          if (placeId) {
            this.db.prepare('INSERT INTO collection_places (collection_id, place_id, sort_order) VALUES (?, ?, ?)').run(item.id, placeId, index + 1);
          }
        });
      }

      for (const note of payload.editorial_notes || []) {
        const placeId = placeSlugToId.get(note.place_slug);
        if (placeId) {
          this.db.prepare('INSERT INTO editorial_notes (id, place_id, status, note, author_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(note.id, placeId, note.status, note.note, note.author_id ?? null, note.created_at);
        }
      }
    });

    run();
  }
}
