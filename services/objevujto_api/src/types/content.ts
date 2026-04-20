export interface SeedUser {
  id: string;
  display_name: string;
  email?: string | null;
  role: string;
  status: string;
}

export interface SeedTaxonomy {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  sort_order?: number;
}

export interface SeedMedia {
  id: string;
  kind: string;
  title: string;
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  credit?: string | null;
}

export interface SeedCollection {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  featured?: boolean;
  place_slugs: string[];
}

export interface SeedPlace {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  short_description?: string | null;
  long_description?: string | null;
  highlights?: string[];
  tips?: string[];
  warnings?: string[];
  category_id?: string | null;
  region_id?: string | null;
  tag_ids?: string[];
  hero_image_id?: string | null;
  gallery_ids?: string[];
  related_place_slugs?: string[];
  featured?: boolean;
  status: string;
  author_id?: string | null;
  editor_id?: string | null;
  created_at: string;
  updated_at: string;
  published_at?: string | null;
}

export interface SeedEditorialNote {
  id: string;
  place_slug: string;
  status: string;
  note: string;
  author_id?: string | null;
  created_at: string;
}

export interface SeedPayload {
  settings: Record<string, unknown>;
  users: SeedUser[];
  categories: SeedTaxonomy[];
  regions: SeedTaxonomy[];
  tags: SeedTaxonomy[];
  media: SeedMedia[];
  collections: SeedCollection[];
  places: SeedPlace[];
  editorial_notes: SeedEditorialNote[];
}
