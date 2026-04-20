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
