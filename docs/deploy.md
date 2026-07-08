# Deployment — plan & decisions (NOT YET DEPLOYED)

Reference for when we deploy. Current state: **local/VM only** via Docker. No cloud resources created.

## Decided free stack (no credit card, permanent)
| Piece | Host | URL | Notes |
|-------|------|-----|-------|
| Frontend | **Cloudflare Pages** | `eos.pages.dev` | Free, works with private repo, root domain, HTTPS, PWA-installable. |
| Backend | **Render** (web service, Docker) | `eos-api.onrender.com` | Free, no card. Sleeps after ~15 min idle → ~30–60s cold start. 512 MB RAM. |
| Database | **Neon** (serverless Postgres) | — | Free, no card, **no expiry** (Render's own free Postgres expires ~30–90 days, so use Neon instead). Use the **direct** (non-pooled) connection string for asyncpg. |

Chosen over GitHub Pages because: repo is private (GH Pages needs public/paid), and CF Pages serves at a root domain (no `/eos/` subpath config).

Baremetal/VM stays supported via existing `docker-compose.yml` — do **not** remove Docker files.

## Code changes needed AT DEPLOY TIME (reverted for now)
1. **Backend honors `$PORT`** (Render injects it). In `backend/Dockerfile`:
   ```dockerfile
   CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
   ```
2. **DB over TLS** for Neon. Add `db_require_ssl: bool = False` to `app/core/config.py`, and in `app/core/db.py` + `migrations/env.py` pass `connect_args={"ssl": True}` when set. Set `DB_REQUIRE_SSL=true` on Render.
3. **CORS**: set `CORS_ORIGINS=["https://eos.pages.dev"]` on Render (env is already read by config).
4. **`render.yaml`** (repo root) blueprint: `runtime: docker`, `dockerfilePath: ./backend/Dockerfile`, `dockerContext: ./backend`, `plan: free`, `healthCheckPath: /health`, envVars: `DATABASE_URL` (Neon, sync:false), `DB_REQUIRE_SSL=true`, `CORS_ORIGINS` (sync:false). Migrations auto-run via entrypoint (`alembic upgrade head`).
5. **`frontend/public/_redirects`** for SPA fallback: `/*  /index.html  200`.
6. **`frontend/package.json`**: add `"packageManager": "pnpm@11.10.0"` so CF Pages uses pnpm.

## DATABASE_URL for Neon
Neon gives e.g. `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/eos?sslmode=require`.
Convert for our app: prefix `+asyncpg`, drop query params, set SSL via env:
```
DATABASE_URL=postgresql+asyncpg://user:pass@ep-xxx.eu-central-1.aws.neon.tech/eos
DB_REQUIRE_SSL=true
```

## How to point the frontend at the backend
The API client (`frontend/src/api/client.ts`) reads `VITE_API_URL`, defaulting to `/api/v1`.
- **Local/VM**: leave unset → uses `/api/v1`, proxied to backend (Vite dev) or nginx (`docker-compose.yml`).
- **Cloud**: set at **build time** on Cloudflare Pages:
  ```
  VITE_API_URL=https://eos-api.onrender.com/api/v1
  ```
  Vite inlines it into the build. Rebuild if it changes.

## Deploy steps (when ready)
1. **Neon**: create project → copy direct connection string.
2. **Render**: New → Blueprint (from repo `render.yaml`) or Web Service (Docker, root `backend/`). Set env: `DATABASE_URL`, `DB_REQUIRE_SSL=true`, `CORS_ORIGINS`. Deploy → note the URL.
3. **Cloudflare Pages**: connect repo. Root dir `frontend`, build `pnpm install && pnpm build`, output `dist`. Env `VITE_API_URL=<render-url>/api/v1`. Deploy → `eos.pages.dev`.
4. Update Render `CORS_ORIGINS` to the Pages URL; redeploy backend.
5. Open `eos.pages.dev` on phone → Add to Home Screen (installable PWA).

## Custom domain later (~$9/yr)
Buy a domain, add it to Cloudflare (free plan). Point:
- **Frontend**: Cloudflare Pages → Custom domain → `app.yourdomain.com` (auto DNS + HTTPS).
- **Backend**: Render → Custom domain → `api.yourdomain.com`; add the CNAME Render shows in Cloudflare DNS.
- Update `VITE_API_URL` → `https://api.yourdomain.com/api/v1` and `CORS_ORIGINS` accordingly.
