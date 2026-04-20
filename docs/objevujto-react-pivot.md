# ObjevujTo React + Node pivot plan

_Last updated: 2026-04-20_

## Why this pivot exists

The initial Python + plain-JS admin scaffold proved useful for quickly validating:
- the split between GitHub Pages frontend and external backend
- public/admin API boundaries
- reverse-proxy deployment under `https://notjackal.eu/objevujto`
- auth protection through `https://auth.notjackal.eu`

However, it is **not** the right long-term implementation surface for this project because:
- the user explicitly wants a more standard **React-based admin UI**
- the current admin UX is too primitive to keep as the real product direction
- the backend should move to a more conventional **Node + TypeScript** stack for easier future iteration with a React admin

## Target stack after pivot

### Public frontend
- keep static on GitHub Pages
- keep HTML + CSS + JS only
- continue consuming JSON from external backend

### Admin frontend
- `React + TypeScript + Vite`
- lives under `services/objevujto_admin/`
- built static bundle served behind `/objevujto/admin`

### Backend API
- `Node.js + TypeScript`
- lives under `services/objevujto_api/`
- serves:
  - `/objevujto/api/public/*`
  - `/objevujto/api/admin/*`
- serves the React admin build under `/objevujto/admin`
- remains behind the current Traefik routing and auth setup on `notjackal.eu`

### Data store
- keep SQLite for MVP persistence
- preserve the existing content model and seed content direction
- keep revisions / editorial notes in the data model

## Migration constraints
- do **not** break the public JSON contract already used by the static frontend unless there is a clear benefit
- do **not** remove the live Python service until the Node replacement is verified locally and can be swapped safely
- keep the current deployment path prefix: `/objevujto`
- preserve auth adapter isolation until real role mapping is implemented

## Build sequence

### Phase 1 — scaffold replacement stack
1. create `services/objevujto_api`
2. create `services/objevujto_admin`
3. mirror current API contract in Node/TS
4. port seed content / repository logic

### Phase 2 — replace temporary admin UI
1. build React admin shell
2. build places list and editor views
3. build taxonomy + media management views
4. keep workflow states and preview support where possible

### Phase 3 — deployment prep
1. wire admin build output into Node API service
2. add Docker deploy bundle for the new stack
3. verify path-prefix operation behind Traefik
4. verify auth redirect/protection still works

### Phase 4 — cutover
1. switch live container from Python service to Node service
2. smoke-test public API, admin login, and edit flows
3. deprecate the Python service in repo docs

## Immediate implementation scope
For the first implementation pass of this pivot, the goal is:
- build a working Node/TS API scaffold with the current content model
- build a working React admin scaffold that can read/write places
- keep the Python service only as a fallback while the replacement is incomplete

## Out of scope for the first pivot pass
- full visual polish of the React admin
- advanced role mapping from auth service
- rich text editor / WYSIWYG
- multilingual support
- final production-grade revision history UI

## Success condition
The pivot is ready when:
- the static frontend can still read the public JSON contract
- the admin is React-based
- editing a place works through the Node/TS API
- the service can be deployed under `https://notjackal.eu/objevujto`
