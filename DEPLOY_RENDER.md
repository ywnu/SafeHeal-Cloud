# SafeHeal Cloud — Render free-hosted demo

**Public site:** https://safeheal-cloud.onrender.com  
**GitHub deployment branch:** `main`  
**App entry point:** `webapp.public:app`. **Never expose `webapp.run:app` to the internet**; it is localhost-only.

## Setup on Render

Create a **Web Service** connected to `ywnu/SafeHeal-Cloud` and choose:

| Setting | Value |
|---|---|
| Name | `safeheal-cloud` (if the name is available) |
| Runtime | Python 3 |
| Branch | `main` |
| Region | Frankfurt |
| Root Directory | Empty |
| Compute | **Free ($0/month)** |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn webapp.public:app --host 0.0.0.0 --port $PORT` |
| Health Check | `/api/health` (if configured) |

### Environment variables (server-side only)

| Variable | Value / note |
|---|---|
| `PYTHON_VERSION` | `3.11.11` |
| `AI_MODE` | **`mock` — keep this value for the public website** |
| `SAFEHEAL_DEMO_PASSWORD` | Unique private password of at least 12 characters (required at startup) |
| `SAFEHEAL_DEMO_USERNAME` | Optional, defaults to `demo` |
| `SAFEHEAL_JUDGE_USERNAME` | Optional separate judge-only username, different from the team username |
| `SAFEHEAL_JUDGE_PASSWORD` | Optional judge-only password, at least 16 characters; both judge variables must be set together |
| `NEBIUS_API_KEY` | Secret API key; needed for real Nemotron inference (never exposed to browser) |
| `NEBIUS_MODEL` | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` |
| `SAFEHEAL_ALLOW_LIVE_DEMO` | `true` to enable rate-limited public Nemotron on fixed bundled evidence |
| `SAFEHEAL_MAX_ANALYSES_PER_HOUR` | Optional public/mock cap; default 40/hour in mock mode |
| `SAFEHEAL_MAX_LIVE_ANALYSES_PER_HOUR` | Optional real-model cap; default 12/hour, max 30/hour per process |

These limits are **in-memory and per process**; they are not billing guarantees. Rotate exposed secrets, keep all keys out of GitHub and frontend JavaScript, and consider provider-side limits on Nebius credit spending.

## Test the public site (no Nebius credits)

After Render shows **Live**, open the URL in an **incognito window**. It should show the dashboard without login.

1. Go to **AI Investigation**.
2. Select **Load demo Dockerfile + logs**, then **Start AI Investigation**.
3. Check `COMPLETED`, `MOCK · ANALYZED`, findings, correlations and separate static reviews.
4. Review the other pages and export the synthetic investigation report if desired.

The public demo runs a **server-side** `GET /web/demo-analysis` and does not upload the intentionally risky example through the browser. Hosting-edge protection can still return HTML `403 Blocked` for *custom* multipart uploads to `POST /api/analyze`. Do not bypass hosting security to force uploads.

## Test the public real Nemotron demo (no password)

**Keep global `AI_MODE=mock`.** The real AI button uses the separate fixed-input endpoint `POST /web/team-nebius-demo`. Ordinary uploaded-file analysis and the mock sample remain mock-only; unrelated private endpoints retain authentication.

1. On Render, set `SAFEHEAL_ALLOW_LIVE_DEMO=true`, `NEBIUS_API_KEY`, and `NEBIUS_MODEL`. Set `SAFEHEAL_MAX_LIVE_ANALYSES_PER_HOUR` for the expected number of visitors. If Render is not deploying through the Blueprint, the `render.yaml` settings do **not** automatically change existing environment variables.
2. Visit https://safeheal-cloud.onrender.com/ in a new incognito window, without signing in.
3. Select **AI Investigation → Run real Nemotron**, confirm the credit-using request, and let inference complete.
4. Verify that the result status is **COMPLETED** and `ai.source` equals `nebius`, not `mock`. Examine independent static patch-review results instead of assuming a generated patch is safe.
5. If the endpoint responds with 503, confirm the live-demo setting and server-side Nebius configuration. HTTP 429 means the server's per-process live call limit was reached. Network errors or model errors may still occur; mock analysis remains available.

**The public live button is intentionally restricted to bundled synthetic Dockerfile and three synthetic log events.** It accepts no browser-uploaded files. The app does not apply patches or block real IP addresses. Real requests consume Nebius credits. The 12/hour default is an in-memory per-process throttle, **not a spending cap**; set an actual provider-side spending allowance if available, and avoid putting keys in Git or client-side code.

## Sharing with judges

Share **https://safeheal-cloud.onrender.com/** only. The dashboard and fixed-data real Nemotron demonstration do not require a username or password. Team administration, raw event feeds, and private backend routes remain restricted. For a judge, the clearest path is **AI Investigation → Run real Nemotron**. Judges should see the model source `NEBIUS` in the resulting analysis. Keep the public instance available through the required judging period. See [JUDGING_ACCESS.md](JUDGING_ACCESS.md).

## Hosting constraints and verification

The Free instance may **sleep after inactivity**, which can delay the first request. The event queue resets on restart; the public feed redacts IP addresses and endpoints.

Direct runtime dependencies in `backend/requirements.txt` and test tools in `requirements-dev.txt` are pinned to previously passing CI versions. GitHub Actions checks clean installs on Ubuntu **and Windows**, and verifies dependency compatibility with `python -m pip check` before the offline tests. Transitive packages remain resolver-selected (not a full hashed lockfile).

GitHub Actions runs offline with `AI_MODE=mock`. On October 29, 2026, **401 tests passed, 2 skipped, 1 warning**. Manual browser tests confirmed both the public mock and a private real Nemotron call. A real reply initially included malformed escaped Dockerfile line breaks; the conflicting static PASS display was fixed in code and regression-tested, but **the originally exported live patch should not be described as passing**.

No proposed Dockerfile has been built or run, no patch was applied, and no real firewall blocking was performed. HTTP Basic and process-local limits are intended for a short hackathon demo, not production use.

See [README.md](README.md) and [contracts/api_contract.md](contracts/api_contract.md) for project and API details.

## Optional local Docker Compose verification

`Dockerfile.web` and `compose.yaml` are for **local mock-only** verification, not Render (which still uses `uvicorn webapp.public:app` directly). Bindings are restricted to `127.0.0.1:8000`, and the app runs as an unprivileged user with a read-only root filesystem and dropped capabilities. Set a private `SAFEHEAL_DEMO_PASSWORD` in your shell, then `docker compose up --build -d`; visit http://127.0.0.1:8000 . Run `docker compose down` afterward. **Never inject real Nebius API keys into this local Compose configuration.**

GitHub Actions also runs an isolated **Chromium** browser flow and an isolated **Docker Compose** health/mock smoke test without Nebius; these jobs do not build or run model-proposed patches.
