# Public demo and release record

Verified on 2 October 2026.

- Frontend: https://dataforge-dina19.vercel.app
- API health: https://dataforge-api-73m0.onrender.com/api/health
- GitHub: https://github.com/alexdina712-dev/dataforge
- CI: https://github.com/alexdina712-dev/dataforge/actions
- Hosting: Vercel Hobby + Render free Python web service, Frankfurt, one worker.
- No cloud database, paid service, permanent upload store or AI API key.

The alternate dataforge-topaz.vercel.app domain redirects to the canonical frontend. Relative /api requests use its same-origin proxy and first-party Secure/HttpOnly session cookie.

Verification: 68 pytest cases, 9 Vitest cases, production TypeScript/Vite build, Ruff checks, 12 desktop/mobile local workflows and 12 desktop/mobile public workflows. Public tests used fictional CSV/XLSX imports and exercised real cleaning, undo/reset, charts, downloads, unauthorized session access and deletion. Tests clean their datasets after completion. GitHub Actions also verifies on Linux.

The Desktop launcher was checked for start, repeated start, complete stop and restart. Local URL: http://127.0.0.1:5176; API port 8004; authenticated loopback launcher control port 5177. Existing portfolio apps use separate ports and are not stopped.

Exact archived Git revision, file checksums and final host checks are included in the release manifest outside the source archive. Docker support is supplied but not executed because Docker is unavailable on this computer.

Free hosting may sleep. Session expiry is absolute at one hour; a service restart removes all uploaded/working data. Export before leaving. No artificial keep-alive traffic or guarantee of uninterrupted availability is provided. The demo uses no account login, so recruiters can explore samples immediately.
