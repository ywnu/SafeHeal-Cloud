# Webapp — Frontend and Public Demo

This folder contains the working SafeHeal Cloud browser dashboard and the FastAPI website entry points. The legacy `frontend/` folder is not the active interface.

## What it does

- Displays Overview, AI Investigation, Docker Security, Threat Monitoring, Live Attack Feed, Reports and Settings.
- Loads a bundled vulnerable Dockerfile and **Classic** synthetic event logs (3 events) for a repeatable demo; the AI investigation explicitly labels this evidence and selects Classic automatically, even if the monitoring explorer previously displayed Extended (16 independent synthetic events).
- Shows findings, log correlations, a proposed Dockerfile, diff and independent static validation.
- Exports the investigation report as JSON and the proposed patch for inspection; neither is executed.
- Shows a sanitized, limited HTTP suspicious-path feed, not a full SIEM.
- Offers a separate team-only real Nemotron demo; public analysis remains mock-only.
- Automatically retries backend health checks after a slow Render cold start or brief interruption, with bounded backoff and a visible reconnecting indicator; it never starts a paid Nemotron request automatically.

## Main files

| File | Role |
| --- | --- |
| `index.html` | Page structure and user interface elements |
| `styles.css` | Dashboard styles and responsive layout |
| `app.js` | Navigation, API requests, findings rendering and downloads |
| `public.py` | Render-facing website: public mock, Basic-authenticated private team access, rate limits, anonymized events |
| `run.py` | Localhost-only website entry point; do not expose publicly |
| `test_public_demo.py` | Offline access-control, endpoint and UI asset tests |

## How it connects

The UI requests `GET /web/demo-analysis` for server-side bundled mock evidence or `POST /api/analyze` for user-provided Dockerfile and optional logs. The gateway delegates analysis to the backend and AI services. The public `POST /web/team-nebius-demo` runs real Nemotron against fixed bundled synthetic evidence, with an explicit server opt-in, server-side Nebius configuration, and a small rate limit. It does **not** accept user uploads or expose the API key.

The website must remain `AI_MODE=mock` on public Render, even when the separate fixed-evidence real inference button is enabled. Do **not** store the Nebius key or team password in JavaScript, HTML or Git. Custom uploads may be stopped by a hosting gateway.

## Public real inference

Visitors open the home page and choose **AI Investigation → Run real Nemotron**, then confirm the credit-using request. Configure `SAFEHEAL_ALLOW_LIVE_DEMO=true`, `NEBIUS_API_KEY` and `NEBIUS_MODEL` on Render. `SAFEHEAL_MAX_LIVE_ANALYSES_PER_HOUR` defaults to 12 calls/hour per process (maximum 30), not a global or provider-side spending cap. Team-only event feeds and API docs still require authentication. See the [judging guide](../JUDGING_ACCESS.md). Never commit credentials or expose them in browser code.

## Run and test

From the repository root, install `requirements-dev.txt` using Python 3.11, copy `.env.example` to a private `.env`, set `AI_MODE=mock`, and run:

```powershell
py -m uvicorn webapp.run:app --host 127.0.0.1 --port 8000
py -m pytest webapp/test_public_demo.py -q
```

The Render deployment entry point and its required environment settings are in [DEPLOY_RENDER.md](../DEPLOY_RENDER.md). The [browser E2E test](../e2e/README.md) exercises the public mock workflow.

## Limitations

Real traffic is not blocked, suggested patches are not deployed, public event data is anonymized and process-local limits are not a spending cap. UI browser coverage is a smoke test, not a full accessibility certification.
