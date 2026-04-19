# ObjevujTo audit and implementation plan

_Last updated: 2026-04-19_

## 1. Current state audit

### Repository + live demo status
- Scope audited: `objevujto/` in `Jackal1337/jackal1337.github.io` plus the live pages at:
  - `https://jackal1337.github.io/objevujto/`
  - `https://jackal1337.github.io/objevujto/index_.html`
  - detail pages under `montgomery.html`, `blueberry.html`, `palomino.html`, `sa.html`
- On 2026-04-19, the live GitHub Pages output matches the checked-in static files for `objevujto/`.
- The current project is a static demo, not yet a maintainable content product.

### Current pages and navigation
- `index.html`
  - landing/placeholder page with “COMING SOON” messaging
  - CTA leads to `index_.html`
- `index_.html`
  - demo homepage
  - links to four hardcoded destination pages:
    - `montgomery.html`
    - `blueberry.html`
    - `palomino.html`
    - `sa.html`
- `montgomery.html`, `blueberry.html`, `palomino.html`
  - nearly identical detail page templates with:
    - hero/header
    - short intro section
    - “Doporučená místa” cards
- `sa.html`
  - catch-all page for multiple leftover locations
  - structurally repeats the same content block three times on a single page

### Current code structure
- HTML only, no application JS
- One shared stylesheet: `objevujto/style.css`
- Bootstrap + icon libraries loaded from CDN on every page
- Content, navigation, taxonomy, and relationships are hardcoded directly into markup
- No build tooling, no data layer, no admin, no API contract, no shared content source

### Reusable UI patterns worth preserving
- Brand/logo and the basic “atlas / guide” direction
- Hero section pattern with image-backed heading + subtitle
- Card-based navigation for top-level discovery
- Basic Czech copy tone for the public-facing guide
- Existing local image assets as seed media for migration

### Problems / inconsistencies / broken parts
- **Hardcoded architecture**: one handcrafted HTML file per place/section is the whole content model.
- **Heavy duplication**: detail pages repeat the same layout and many of the same blocks verbatim.
- **Placeholder/demo content still present**:
  - `Lorem ipsum` text on `palomino.html` and `sa.html`
  - `Card title` / `Some quick example text` placeholders across detail pages
  - `https://placehold.co/...` images used in recommended-place cards
- **No JSON/data source**: frontend cannot evolve into a multi-author content product without a backend.
- **No admin**: no editorial workflow, no roles, no revisions, no taxonomy management.
- **No scalable routing model**: adding places currently means copying and editing a full HTML file.
- **Weak content model**:
  - “Ostatní” / `sa.html` collapses multiple regions/cities into one catch-all page
  - categories, regions, tags, related places, collections do not exist as entities
- **Styling issues**:
  - global CSS is small but mixes layout, component, and page-specific hero styling in one file
  - one stray extra `>` exists in `index_.html` (`<div class="d-flex ...">>`)
  - body text color/background assumptions are inconsistent with Bootstrap content sections
- **Accessibility / SEO gaps**:
  - no robust metadata strategy
  - generic alt text in placeholder cards
  - no structured content rendering model for future SEO improvements
- **Operational gap**:
  - static Pages site exists, but there is no external backend at `https://notjackal.eu/objevujto` yet in this repo

### What should be preserved vs replaced

#### Preserve
- `objevujto/assets/img/` as seed media
- visual identity direction (logo, atlas/travel-guide framing)
- Czech content tone where real copy already exists
- simple static frontend deployment on GitHub Pages

#### Replace / phase out
- per-place handcrafted HTML as the long-term content architecture
- `index_.html` as the main home implementation
- `sa.html` catch-all model
- placeholder cards/text/images
- direct content ownership by HTML files

## 2. Target architecture

### Product split
1. **Public frontend**
   - hosted from the GitHub Pages repo
   - plain HTML + CSS + JS only
   - reads data from external JSON API
2. **Custom backend + admin**
   - hosted externally under `https://notjackal.eu/objevujto`
   - exposes public JSON endpoints for the Pages frontend
   - exposes protected admin endpoints + admin UI behind login
3. **Authentication integration**
   - delegated to `https://auth.notjackal.eu`
   - backend must isolate auth concerns behind an adapter/config boundary

### Proposed implementation approach

#### Frontend (GitHub Pages)
- Keep the frontend fully static.
- Move to reusable page shells plus client-side rendering:
  - `index.html` → real homepage consuming API JSON
  - `places.html` → listing/filter page consuming API JSON
  - `place.html?slug=...` → generic place detail page consuming API JSON
- Preserve compatibility during migration by converting old hardcoded pages into thin redirect/bridge pages where useful.
- Introduce a small frontend architecture:
  - `assets/js/config.js`
  - `assets/js/api.js`
  - `assets/js/render/*.js`
  - `assets/js/pages/*.js`
  - `assets/css/base.css`, `components.css`, `pages.css`

#### Backend/admin (external host)
- Build a **custom Python 3.12 + SQLite MVP** with standard-library-first design.
- Why this stack for MVP:
  - simple deployment on a small VPS
  - zero mandatory third-party runtime dependencies for the first slice
  - easy JSON API creation
  - easy local seeding/migration with `sqlite3`
  - maintainable enough to iterate before introducing heavier tooling
- Deployment target shape:
  - reverse proxy at `https://notjackal.eu/objevujto`
  - backend app serves:
    - `/api/public/*`
    - `/api/admin/*`
    - `/admin/*`
- Auth integration:
  - backend contains an auth adapter interface for validating sessions/tokens from `auth.notjackal.eu`
  - exact protocol wiring remains configurable until credential/protocol details are available

### High-level directory proposal

```text
objevujto/
  index.html
  places.html
  place.html
  legacy/
  assets/
    css/
    js/
    img/
services/
  objevujto_backend/
    app/
    data/
    scripts/
    tests/
docs/
  objevujto-plan.md
```

## 3. Content model

### Core entities
- `places`
- `categories`
- `regions`
- `tags`
- `media`
- `collections`
- `users`
- `revisions`
- `editorial_notes`

### Minimum place fields

```json
{
  "id": "place_montgomery",
  "slug": "montgomery",
  "title": "Montgomery",
  "subtitle": "Obec ležící v samotném srdci Red County.",
  "excerpt": "Klíčová vesnice Red County se silnou přítomností státních institucí.",
  "short_description": "Stručný perex pro listingy a homepage moduly.",
  "long_description": "Plný popis místa pro detail stránky.",
  "highlights": ["Policie SA", "HZS", "ZZS"],
  "tips": ["Doporučený čas návštěvy..."],
  "warnings": ["Počítejte s vyšším provozem..."],
  "category": { "id": "cat_town", "slug": "mesta-a-obce", "title": "Města a obce" },
  "region": { "id": "region_red_county", "slug": "red-county", "title": "Red County" },
  "tags": [{ "id": "tag_urady", "slug": "urady", "title": "Úřady" }],
  "hero_image": { "id": "media_montgomery_hero", "url": "https://notjackal.eu/objevujto/media/montgomery.jpg", "alt": "Panorama Montgomery" },
  "gallery": [],
  "related_places": ["blueberry", "palomino-creek"],
  "featured": true,
  "status": "published",
  "author": { "id": "user_jackal", "display_name": "Jackal" },
  "editor": { "id": "user_editor", "display_name": "Editor" },
  "created_at": "2026-04-19T00:00:00Z",
  "updated_at": "2026-04-19T00:00:00Z",
  "published_at": "2026-04-19T00:00:00Z"
}
```

### Relational notes
- A place belongs to one primary category and one primary region in MVP.
- A place can have many tags and many gallery media items.
- Collections can surface editorially curated sets (for homepage, seasonal guides, county picks, etc.).
- Revisions + editorial notes attach to places.

## 4. JSON API contract proposal

Base URL target:
- production: `https://notjackal.eu/objevujto/api`

### Public API

#### `GET /public/site`
Purpose: homepage and shared navigation payload.

Example:
```json
{
  "site": {
    "title": "ObjevujTo",
    "tagline": "Obsahový atlas a průvodce po San Andreas"
  },
  "navigation": {
    "featured_places": ["montgomery", "blueberry", "palomino-creek"],
    "featured_collections": ["red-county"]
  },
  "homepage": {
    "hero": {
      "title": "Jedinečný online průvodce po celém San Andreas",
      "subtitle": "Objevujte místa, podniky a zajímavosti podle regionů i témat"
    },
    "featured_places": [],
    "featured_collections": [],
    "featured_regions": []
  }
}
```

#### `GET /public/places`
Purpose: places listing with optional filters.

Query params (MVP):
- `region`
- `category`
- `tag`
- `status` (backend should force `published` on public requests)
- `q`
- `featured`
- `page`
- `limit`

Example:
```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 0,
    "pages": 0
  },
  "filters": {
    "region": null,
    "category": null,
    "tag": null,
    "q": null
  }
}
```

#### `GET /public/places/:slug`
Purpose: place detail for the static detail page.

Example:
```json
{
  "item": {},
  "related": [],
  "breadcrumbs": [
    { "title": "Domů", "href": "/objevujto/" },
    { "title": "Red County", "href": "/objevujto/places.html?region=red-county" },
    { "title": "Montgomery", "href": "/objevujto/place.html?slug=montgomery" }
  ]
}
```

#### `GET /public/categories`
#### `GET /public/regions`
#### `GET /public/tags`
#### `GET /public/collections`
Purpose: taxonomy/navigation/filter data.

### Admin API

Protected by backend auth/session middleware.

#### `GET /admin/session`
- returns authenticated user and role

#### `GET /admin/dashboard`
- returns counts and recent editorial activity

#### `GET /admin/places`
#### `POST /admin/places`
#### `GET /admin/places/:id`
#### `PUT /admin/places/:id`
#### `GET /admin/places/:id/revisions`
#### `POST /admin/places/:id/publish`

#### `GET /admin/categories`
#### `POST /admin/categories`
#### `GET /admin/regions`
#### `POST /admin/regions`
#### `GET /admin/tags`
#### `POST /admin/tags`

#### `GET /admin/media`
#### `POST /admin/media`

### Auth integration contract boundary
Because `auth.notjackal.eu` protocol details are not yet available in this repo, the backend should expose a single adapter boundary such as:
- `AuthAdapter.validate_request(request_headers, cookies) -> Session | None`
- `AuthAdapter.login_url(return_to)`
- `AuthAdapter.logout_url(return_to)`

That lets the rest of the app progress without hardcoding auth implementation assumptions.

## 5. Admin MVP scope

### Must-have MVP
1. protected admin shell
2. dashboard with content counts/statuses
3. places list
4. create/edit place form
5. media library/upload metadata flow
6. taxonomy management
   - categories
   - regions
   - tags
7. workflow statuses
   - draft
   - review
   - published
   - archived
8. role model
   - admin
   - editor
   - author
9. revision/change log (basic)
10. optional JSON preview endpoint/view

### Explicitly deferred from MVP
- comments
- ratings
- advanced analytics
- page builder
- complex WYSIWYG
- multilingual support
- advanced personalization

## 6. Frontend MVP scope

### Must-have MVP
- homepage consuming JSON
- places listing consuming JSON
- generic place detail consuming JSON by slug
- reusable loading / empty / error states
- taxonomy-driven filters/navigation where feasible
- legacy pages either removed from main navigation or turned into compatibility bridges

### Frontend principles
- no long-term hardcoded content ownership in HTML
- plain HTML/CSS/JS only
- progressive enhancement
- reusable render helpers
- SEO-conscious metadata and heading structure where possible

## 7. Migration plan

### Phase 1 — audit + architecture
- document current state
- define entity model
- define public/admin API contracts
- set directory structure and implementation boundaries

### Phase 2 — canonical seed content
- map existing static content into structured seed data
- normalize slugs, categories, regions, tags, and media references
- seed backend database from this canonical content set

### Phase 3 — backend/admin scaffold
- create backend app skeleton
- implement SQLite schema + seed loading
- implement public API routes
- scaffold protected admin shell and CRUD endpoints
- keep auth adapter swappable until auth integration details are available

### Phase 4 — frontend refactor
- replace `index_.html` with API-driven homepage
- add API-driven `places.html`
- add API-driven `place.html`
- wire UI to backend JSON
- add graceful fallbacks and status handling

### Phase 5 — legacy migration
- convert old per-place HTML pages into thin redirects/compatibility pages
- retire placeholder content
- move “Ostatní” content into proper place entities and/or collections

### Phase 6 — editorial hardening
- improve revisions, previews, media handling, and QA workflows
- then begin broader UI/UX overhaul on top of the data-driven foundation

## 8. Immediate implementation sequence
1. Add this plan doc.
2. Create backend/admin scaffold with SQLite schema and seed data.
3. Refactor the public frontend to a JSON-driven homepage/list/detail foundation.
4. Migrate existing place content into structured seed data.
5. Replace legacy navigation with new data-driven routes.
6. Document deployment/auth wiring gaps for `notjackal.eu` + `auth.notjackal.eu`.

## 9. Current recommendation
Do **not** start with a visual redesign.
Start with the content model, contracts, backend/admin scaffold, and a minimal but real data-driven frontend foundation. Once the product stops depending on handwritten HTML pages, the later UI/UX overhaul will be much cheaper and safer.
