# Verification record

Date: 2 October 2026. Tests use fictional data only.

- Python: 67 domain/API/security tests; Ruff lint and formatting.
- Frontend: 9 validation/display unit tests; TypeScript and Vite production build.
- Browser: six critical workflows on desktop and mobile Chromium (12 cases), real CSV/XLSX imports, profile/pagination, preview/apply, undo/reset, four charts, duplicate review, downloads, privacy and deletion.
- Screenshots: actual running application, desktop and 390px mobile. No synthetic product mockups.

Public deployment, GitHub CI and Desktop launcher checks are recorded in PUBLIC_DEPLOYMENT.md when completed.

Docker support is supplied, but Docker is unavailable on this computer; no Docker build/run success is claimed. Native Python/Vite execution and hosted deployment are the verified paths. Starlette emits one upstream httpx deprecation warning in tests; no test failures result.

No independent security audit or universal browser/accessibility certification is claimed. The temporary memory store, explicit capacity and public hosting limitations are documented.
