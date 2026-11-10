# End-to-End Tests — SafeHeal Cloud

This folder contains the browser smoke test that verifies the integrated **public mock** demo with real Chromium and a local server.

## File

- `browser_smoke.py` starts a temporary localhost Uvicorn instance, opens headless Chromium with Playwright, checks the dashboard workflow, then shuts the server down.

## What it verifies

1. Public homepage loads and connects to the backend without a login.
2. Real Nemotron is unavailable (HTTP 503) when explicitly disabled; the offline E2E never incurs paid inference.
3. The built-in Dockerfile and synthetic logs load, and mock analysis completes.
4. Findings, event correlations, proposed patch and static checks appear.
5. Docker Security shows the proposed Dockerfile/diff.
6. The downloaded JSON investigation report contains mock analysis and simulated response metadata.

This test does **not** call Nebius, use live API credentials, deploy proposed fixes or perform real blocking.

## Run locally

From the project root with Python 3.11:

```powershell
py -m pip install -r requirements-dev.txt
py -m pip install -r requirements-e2e.txt
py -m playwright install chromium
py e2e/browser_smoke.py
```

The GitHub Actions workflow also runs browser E2E plus Windows/Ubuntu unit tests and a separate local Docker Compose build-and-smoke job. See [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).

## Scope

This is a critical-path **smoke test**, not exhaustive browser, assistive-technology, security-penetration or live-model validation. Docker Compose tests the application's own container, not a model-generated remediation image.
