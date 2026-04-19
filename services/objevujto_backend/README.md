# ObjevujTo backend/admin MVP scaffold

This service is the external JSON/backend half of the ObjevujTo split architecture:

- public frontend stays static on GitHub Pages
- backend/admin runs separately (target: `https://notjackal.eu/objevujto`)
- public frontend consumes JSON from `/api/public/*`
- admin UI is served from `/admin/*`

## Why this scaffold exists

The old ObjevujTo demo stored content directly in HTML files under `objevujto/`.
This service introduces a maintainable foundation:

- canonical content model
- SQLite-backed seed data
- public JSON contracts
- protected admin shell
- revision tracking hooks
- isolated auth adapter boundary for `auth.notjackal.eu`

## Stack

- Python 3.12
- standard library HTTP server
- SQLite (`sqlite3`)
- plain HTML/CSS/JS admin shell

## Run locally

```bash
cd services/objevujto_backend
python3 -m app
```

Default local URL:
- `http://127.0.0.1:8787`

## Local dev auth

Until real auth integration is wired, local development uses `OBJEVUJTO_AUTH_MODE=stub`.
You can authenticate API calls with headers such as:

```bash
-H 'X-Objevujto-Dev-User: local_admin' \
-H 'X-Objevujto-Dev-Role: admin'
```

The admin shell also offers a local dev session helper when the backend is in stub mode.

## Important routes

Public:
- `GET /api/public/site`
- `GET /api/public/places`
- `GET /api/public/places/:slug`
- `GET /api/public/categories`
- `GET /api/public/regions`
- `GET /api/public/tags`
- `GET /api/public/collections`

Admin:
- `GET /api/admin/session`
- `GET /api/admin/dashboard`
- `GET|POST /api/admin/places`
- `GET|PUT /api/admin/places/:id`
- `POST /api/admin/places/:id/publish`
- `GET /api/admin/places/:id/revisions`
- `GET|POST /api/admin/categories`
- `GET|POST /api/admin/regions`
- `GET|POST /api/admin/tags`
- `GET|POST /api/admin/media`
- `GET /api/admin/users`

## Auth integration boundary

Real integration with `https://auth.notjackal.eu` is intentionally isolated behind `app/auth.py`.
Once protocol details are available, replace the stub/forward-header logic without rewriting public/admin business logic.

## Seed content

Canonical seed content lives in:
- `data/seed_content.json`

This seed replaces the old hardcoded-per-page model and acts as the first structured migration source for existing ObjevujTo content.
