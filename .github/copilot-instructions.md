## Purpose
Give concise, repo-specific guidance so AI coding agents can be productive immediately.

## Big picture
- This is a full‑stack TypeScript project: a Fastify + Prisma backend (`/backend`) and a React + Vite frontend (`/frontend`).
- Backend serves API and production-built frontend (`fastify` + `fastify-static`) from `backend/src/server.ts`.
- Database: PostgreSQL via Prisma. Schema is in `backend/prisma/schema.prisma`; migrations live in `backend/prisma/migrations`.

## How to run (local dev)
- Backend: `cd backend && npm install` then `npm run dev` (uses `tsx watch src/server.ts`).
- Frontend: `cd frontend && npm install` then `npm run dev` (Vite dev server).
- Seed DB: `cd backend && npx prisma db seed` (configured in `package.json` under `prisma.seed`).

## Build & production notes
- Backend build: `npm run build` in `/backend` — runs `prisma generate` then `tsup` to `dist/` and `npm start` runs `node dist/server.js`.
- Frontend build: `npm run build` in `/frontend` (runs `tsc && vite build`). The backend expects the frontend artifacts in `frontend/dist` and serves them at runtime.

## Key files and examples to read
- `backend/src/server.ts` — central bootstrapping: registers routes, JWT auth, multipart uploads, static serving, SPA catch-all.
- `backend/prisma/schema.prisma` — canonical data model (enums, relations, indices, important domain names: `Case`, `User`, `Paf`, `Evolucao`).
- `backend/package.json` — dev/start/build scripts; uses `tsx`, `tsup`, and `prisma`.
- `frontend/src/lib/api.ts` — axios instance, baseURL logic (DEV -> `http://localhost:3333`, PROD -> relative path), request/response interceptors for JWT handling.
- `frontend/src/contexts/AuthContext.tsx` — how tokens are stored/validated (`localStorage`, `STORAGE_KEYS.TOKEN`) and how login/logout flows work.

## Project-specific conventions & patterns
- Auth: backend uses `@fastify/jwt` with a `decorate('authenticate', ...)` helper in `server.ts`; frontend stores tokens in `localStorage` and sets `Authorization: Bearer` on axios (see `api.ts`).
- File uploads: backend uses `@fastify/multipart` and stores files under the `uploads` directory (created at startup in `server.ts`).
- Routes: grouped under `backend/src/routes/*.ts` and registered centrally in `server.ts`. Prefer adding new routes there and exporting a register function like existing routes.
- Prisma: run `npx prisma migrate dev` during schema changes and `npx prisma generate` after updating schema. Seeds implemented at `backend/prisma/seed.ts` (invoked via `npx prisma db seed`).

## Common tasks and examples
- Add a new API route: create file in `backend/src/routes`, export a register function, then `import` and `app.register()` it in `server.ts`.
- Read authenticated user in backend: use `request.user` after running `request.jwtVerify()` in `authenticate` decorator.
- Serve new frontend assets in production: `cd frontend && npm run build` then `backend` must serve `frontend/dist` (server already configured).

## Integration points & external services
- Database: expects `DATABASE_URL` env var (Postgres). See `backend/prisma/schema.prisma` datasource.
- JWT secret: `JWT_SECRET` env var used by `@fastify/jwt` in `server.ts`.

## What to avoid / pitfalls
- Do not assume backend uses Express; Fastify semantics (plugins/decoration) are important.
- When changing Prisma models, run migrations and `prisma generate` to avoid runtime client errors.
- Upload limit: server enforces 5MB per file in multipart config.

## When making PRs — useful files to reference in review
- `backend/src/server.ts`, `backend/prisma/schema.prisma`, any changed `backend/src/routes/*`, `frontend/src/lib/api.ts`, and `frontend/src/contexts/AuthContext.tsx`.

## If you need to run tests or static checks
- Lint frontend: `cd frontend && npm run lint`.

## Questions for maintainers (ask if unclear)
- Preferred deployment host and environment variables for production (current setup assumes serving built frontend from backend).
- Any intended runtime differences for CORS or `VITE_API_URL` in CI/staging.

---
If anything here is unclear or you want a different level of detail (examples for adding a route, a code snippet for a JWT-protected endpoint, or a template PR checklist), tell me which area to expand.
