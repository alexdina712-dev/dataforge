# Deployment

## Render backend

Free Python web service from this repository; root at repository root; Python 3.12.14 explicitly pinned.

Build: `pip install -r backend/requirements.txt`

Start: `python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --workers 1 --limit-concurrency 20 --no-access-log`

Health: /api/health. Environment: ENVIRONMENT=production; APP_ORIGIN=https://dataforge-dina19.vercel.app; SESSION_TTL_SECONDS=3600; MAX_STORE_BYTES=100663296; PYTHON_VERSION=3.12.14. No database/disk needed. One worker is required for the process-local store.

Free hosting sleeps after inactivity; no artificial keep-alive traffic. Shared monthly free hours apply across this account's apps. This project does not require a paid upgrade.

## Vercel frontend

Vite, Node 22 or 24; `pnpm install --frozen-lockfile`; `pnpm build`; output dist. Generate config: `node scripts/configure-vercel.mjs https://YOUR-API.onrender.com`, then commit. /api rewrites to the backend; remaining routes serve index.html. The canonical origin must match APP_ORIGIN exactly. Relative requests preserve first-party cookies.

The portfolio frontend is deployed with authenticated Vercel CLI; automatic GitHub frontend deployment is not assumed. For changes: verify CI, deploy backend, then `vercel --prod` from a clean archive. Private CLI auth/OIDC files stay outside source/backups. Preview origins cannot mutate production data.

## Release and rollback

Run lint, pytest, Vitest, build and local Playwright. Review tracked payload for secrets/user data. Check CI and Render live commit. Verify health, canonical cookie/origin behavior and public browser workflows. Archive exact Git revision. Rollback redeploys a known-good revision on both hosts; API restart clears temporary sessions.

## Docker alternative

`docker compose up --build`, http://localhost:8080. Multi-stage frontend build plus non-root Python API/static assets. One worker; 512 MiB Compose memory limit and health check. Change APP_ORIGIN/ENVIRONMENT for HTTPS production. See verification notes for execution status; native local/hosted paths are primary.
