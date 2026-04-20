export const SCHEMA_SQL = `
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
`;
