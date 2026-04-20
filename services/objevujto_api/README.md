# ObjevujTo API (Node + TypeScript)

Replacement direction for the temporary Python backend.

## Stack
- Express
- TypeScript
- SQLite via `better-sqlite3`

## Purpose
- keep the public JSON contract for the static GitHub Pages frontend
- provide admin endpoints for the React admin
- support deployment behind `/objevujto`
- stay compatible with `auth.notjackal.eu` forward-auth headers

## Scripts
```bash
npm run dev
npm run build
npm test
```


## Auth role mapping

Forward-auth sessions from `auth.notjackal.eu` are no longer granted admin access by default.
The API now maps external identities (currently Discord IDs from `X-Auth-User-Id`) to local ObjevujTo users via the `auth_identities` table.

Behavior:
- mapped identity -> local user + local role
- unmapped identity -> authenticated but `guest`, denied admin data routes

A seed mapping for the primary owner account is included in `services/objevujto_backend/data/seed_content.json`.
The React admin also exposes a basic access-mapping panel for admins.
