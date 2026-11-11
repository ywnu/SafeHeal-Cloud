"""Public, cost-safe SafeHeal Cloud showcase for the hackathon.

The original webapp.run remains strictly localhost-only. Use this separate
entrypoint for HTTPS deployments behind a reverse proxy such as Render.

Anyone can view the site, run mock analysis, and explicitly request real Nebius
analysis of bundled synthetic evidence when enabled. Other private API routes
still require a password; public live telemetry is anonymized.
This is not production-grade authentication, logging, or billing enforcement.
"""
from __future__ import annotations

import base64
import binascii
import io
import json
import os
import secrets
import time
from dataclasses import replace
from collections import deque
from contextlib import asynccontextmanager
from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, PlainTextResponse, RedirectResponse
from starlette.concurrency import run_in_threadpool
from ai.config import get_settings, load_dotenv
from ai.service import analyze_evidence
from backend.live_events import get_events_after
from backend.main import app as backend_app
from backend.simulation import simulate_response
from backend.validator import validate_dockerfile, review_proposed_patch

load_dotenv()
ASSETS = Path(__file__).resolve().parent
REPO = ASSETS.parent
_attempts: deque[float] = deque()
_live_attempts: deque[float] = deque()
_attempts_lock = Lock()
WINDOW_SECONDS = 3600


def _basic_credentials(header: str) -> tuple[str, str] | None:
    """Decode HTTP Basic credentials; never log the decoded value."""
    scheme, sep, encoded = header.partition(" ")
    if not sep or scheme.lower() != "basic":
        return None
    try:
        raw = base64.b64decode(encoded, validate=True).decode("utf-8")
    except (ValueError, UnicodeDecodeError, binascii.Error):
        return None
    username, delim, password = raw.partition(":")
    return (username, password) if delim else None


def _valid_basic_auth(header: str) -> bool:
    """Full team access, never granted by the judge-only credentials."""
    pair = _basic_credentials(header)
    if pair is None:
        return False
    expected_password = os.getenv("SAFEHEAL_DEMO_PASSWORD", "")
    expected_user = os.getenv("SAFEHEAL_DEMO_USERNAME", "demo")
    return bool(expected_password) and (
        secrets.compare_digest(pair[0], expected_user)
        and secrets.compare_digest(pair[1], expected_password)
    )


def _valid_judge_basic_auth(header: str) -> bool:
    """Optional separate credentials for judging, limited to the fixed live demo."""
    expected_user = os.getenv("SAFEHEAL_JUDGE_USERNAME", "").strip()
    expected_password = os.getenv("SAFEHEAL_JUDGE_PASSWORD", "")
    if not expected_user or len(expected_password) < 16:
        return False
    pair = _basic_credentials(header)
    return pair is not None and (
        secrets.compare_digest(pair[0], expected_user)
        and secrets.compare_digest(pair[1], expected_password)
    )


def _judge_route(request: Request) -> bool:
    """A judge never gets raw event feeds, API docs or arbitrary private routes."""
    return (request.method, request.url.path) in {
        ("GET", "/web/unlock"),
        ("POST", "/web/team-nebius-demo"),
    }


def _allow_analysis() -> bool:
    """Small process-local limit, not a durable or distributed billing cap."""
    default_limit = 40 if get_settings().mode == "mock" else 8
    try:
        limit = max(1, min(100, int(os.getenv("SAFEHEAL_MAX_ANALYSES_PER_HOUR", str(default_limit)))))
    except ValueError:
        limit = default_limit
    now = time.monotonic()
    with _attempts_lock:
        while _attempts and _attempts[0] <= now - WINDOW_SECONDS:
            _attempts.popleft()
        if len(_attempts) >= limit:
            return False
        _attempts.append(now)
        return True


def _allow_live_analysis() -> bool:
    """Separate small rate limit for paid inference (per worker, not a budget cap)."""
    try:
        limit = max(1, min(30, int(os.getenv("SAFEHEAL_MAX_LIVE_ANALYSES_PER_HOUR", "12"))))
    except ValueError:
        limit = 12
    now = time.monotonic()
    with _attempts_lock:
        while _live_attempts and _live_attempts[0] <= now - WINDOW_SECONDS:
            _live_attempts.popleft()
        if len(_live_attempts) >= limit:
            return False
        _live_attempts.append(now)
        return True


@asynccontextmanager
async def lifespan(_: FastAPI):
    if len(os.getenv("SAFEHEAL_DEMO_PASSWORD", "")) < 12:
        raise RuntimeError(
            "SAFEHEAL_DEMO_PASSWORD must be set to at least 12 characters "
            "before exposing SafeHeal Cloud publicly."
        )
    judge_user = os.getenv("SAFEHEAL_JUDGE_USERNAME", "").strip()
    judge_password = os.getenv("SAFEHEAL_JUDGE_PASSWORD", "")
    if judge_user or judge_password:
        if not judge_user or len(judge_password) < 16:
            raise RuntimeError(
                "Judge access requires SAFEHEAL_JUDGE_USERNAME and a "
                "SAFEHEAL_JUDGE_PASSWORD of at least 16 characters."
            )
        if judge_user == os.getenv("SAFEHEAL_DEMO_USERNAME", "demo"):
            raise RuntimeError(
                "SAFEHEAL_JUDGE_USERNAME must differ from the team username."
            )
    yield


app = FastAPI(lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)


# Explicit allowlist: never expose arbitrary backend routes anonymously.
PUBLIC_GET_PATHS = frozenset({
    "/",
    "/web/assets/app.js",
    "/web/assets/styles.css",
    "/web/demo-dockerfile",
    "/web/demo-analysis",  # Fixed server-side mock evidence, no risky upload.
    "/web/live-events",
    "/api/health",
    "/api/attack-events",  # Bundled synthetic scenarios, not observed traffic.
    "/api/debug/demo",     # Harmless test probe; intentionally returns 404.
})


def _is_public_request(request: Request) -> bool:
    if request.method == "POST" and request.url.path == "/web/team-nebius-demo":
        # This route processes fixed bundled synthetic evidence only. It is
        # separately opt-in, server-configured and rate-limited below.
        return True
    if request.method == "GET" and request.url.path in PUBLIC_GET_PATHS:
        return True
    if request.method == "POST" and request.url.path == "/api/analyze":
        # Public analysis is safe in mock mode ONLY. Switching to live
        # immediately requires Basic Auth for the same endpoint.
        return get_settings().mode == "mock"
    return False


@app.middleware("http")
async def protect_public_demo(request: Request, call_next):
    auth_header = request.headers.get("authorization", "")
    team_authenticated = _valid_basic_auth(auth_header)
    judge_authenticated = (
        not team_authenticated and _valid_judge_basic_auth(auth_header)
    )
    # Old judge links pointed to /web/unlock and triggered the browser's
    # native password dialog. Public judges now use the home page instead.
    # Retain the old authenticated landing page for explicit team credentials.
    if (
        request.method == "GET"
        and request.url.path == "/web/unlock"
        and not (team_authenticated or judge_authenticated)
    ):
        return RedirectResponse(
            url="/", status_code=302, headers={"Cache-Control": "no-store"}
        )
    if not _is_public_request(request):
        if not team_authenticated and not judge_authenticated:
            return JSONResponse(
                status_code=401,
                content={"detail": "Private demo credentials required for this endpoint"},
                headers={
                    "Cache-Control": "no-store",
                    **(
                        {"WWW-Authenticate": 'Basic realm="SafeHeal Cloud Private Demo", charset="UTF-8"'}
                        if request.url.path == "/web/unlock"
                        else {}
                    ),
                },
            )
        if judge_authenticated and not _judge_route(request):
            return JSONResponse(
                status_code=403,
                content={"detail": "Judge access is limited to the fixed Nemotron demonstration"},
                headers={"Cache-Control": "no-store"},
            )

    analysis_request = (
        request.method == "POST" and request.url.path == "/api/analyze"
    ) or (
        request.method == "GET" and request.url.path == "/web/demo-analysis"
    )
    if analysis_request:
        if not _allow_analysis():
            return JSONResponse(
                status_code=429,
                content={"detail": "Demo analysis limit reached. Try again later."},
                headers={"Cache-Control": "no-store"},
            )

    if request.method == "POST" and request.url.path == "/web/team-nebius-demo":
        # Cross-origin browser requests must not trigger paid inference.
        # No credentials or uploaded data are accepted by this public route.
        origin = request.headers.get("origin")
        if origin and origin != f"https://{request.headers.get('host', '')}":
            return JSONResponse(status_code=403, content={"detail": "Invalid request origin"})
        if os.getenv("SAFEHEAL_ALLOW_LIVE_DEMO", "").lower() not in {"1", "true"}:
            return JSONResponse(status_code=503, content={"detail": "Real Nemotron demo is not enabled on this server"})
        settings = get_settings()
        if not settings.api_key or not settings.model:
            return JSONResponse(status_code=503, content={"detail": "Nebius server configuration is incomplete"})
        if not _allow_live_analysis():
            return JSONResponse(
                status_code=429,
                content={"detail": "Team live analysis quota reached. Try again later."},
                headers={"Cache-Control": "no-store"},
            )

    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    return response


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(ASSETS / "index.html", media_type="text/html")


@app.get("/web/assets/{filename}", include_in_schema=False)
def safe_asset(filename: str):
    if filename not in {"app.js", "styles.css"}:
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(ASSETS / filename)


@app.get("/web/demo-dockerfile", include_in_schema=False)
def demo_dockerfile():
    path = REPO / "security" / "vulnerable.Dockerfile"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Sample Dockerfile unavailable")
    return PlainTextResponse(path.read_text(encoding="utf-8"))


@app.get("/web/demo-analysis", include_in_schema=False)
async def demo_analysis():
    """Analyze bundled synthetic evidence without uploading it through the CDN.

    This is intentionally unavailable in live mode: the endpoint can never
    spend Nebius credits, even for users with the private demo password.
    """
    if get_settings().mode != "mock":
        raise HTTPException(
            status_code=403,
            detail="Demo-only analysis is disabled in live mode",
        )

    from fastapi import UploadFile
    from backend.main import analyze

    dockerfile = (REPO / "security" / "vulnerable.Dockerfile").read_bytes()
    logs = (REPO / "security" / "attack_logs.json").read_bytes()

    return await analyze(
        dockerfile=UploadFile(
            filename="Dockerfile",
            file=io.BytesIO(dockerfile),
        ),
        attack_logs=UploadFile(
            filename="attack_logs.json",
            file=io.BytesIO(logs),
        ),
    )


@app.post("/web/team-nebius-demo", include_in_schema=False)
async def team_nebius_demo():
    """Public, opt-in, rate-limited Nemotron inference on fixed synthetic evidence.

    There is intentionally no upload body here; the hosting edge may reject
    the insecure demonstration Dockerfile and attack strings. The ordinary
    public /web/demo-analysis endpoint remains mock-only.
    """
    dockerfile_text = (REPO / "security" / "vulnerable.Dockerfile").read_text(encoding="utf-8")
    logs = json.loads((REPO / "security" / "attack_logs.json").read_text(encoding="utf-8"))

    # Never change the process-wide AI_MODE; that would race with public
    # requests. Inject an immutable explicit live settings object instead.
    settings = replace(get_settings(), mode="live")
    result = await run_in_threadpool(analyze_evidence, dockerfile_text, logs, settings)

    original_review = validate_dockerfile(dockerfile_text)
    result["tests"] = {
        "status": "completed",
        "passed": original_review["passed"],
        "details": original_review["details"],
    }
    # Match /api/analyze: both static reviewers must pass.
    review_proposed_patch(dockerfile_text, result)

    result["response"] = simulate_response(logs)
    return result


@app.get("/web/live-events", include_in_schema=False)
def demo_live_events(after_id: int = 0):
    """Public feed without client IP addresses or requested URL paths."""
    if after_id < 0:
        raise HTTPException(status_code=422, detail="after_id must be nonnegative")
    events = get_events_after(after_id)
    public_events = [
        {
            "id": event["id"],
            "timestamp": event["timestamp"],
            "event_type": event["event_type"],
            "source_ip": "REDACTED",
            "endpoint": "[redacted]",
            "severity": event["severity"],
            "status": event["status"],
            "action_taken": "NONE",
        }
        for event in events
    ]
    return {"mode": "live", "privacy": "anonymized", "total": len(public_events), "events": public_events}


@app.get("/web/unlock", include_in_schema=False)
def unlock_private_demo():
    """Landing page after team/judge HTTP Basic authentication.

    Only authenticated visitors can reach this route (see middleware). Provide
    an obvious path to the actual investigation; the dashboard's #analysis
    fragment is handled by app.js. Never launch paid inference automatically.
    """
    return HTMLResponse(
        """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Access enabled | SafeHeal Cloud</title>
  <style>
    :root {color-scheme: dark;}
    body {margin: 0; min-height: 100vh; display: grid; place-items: center;
      font-family: system-ui, sans-serif; background: #0b1225; color: #eef1ff;}
    main {box-sizing: border-box; width: min(92vw, 540px); padding: 2rem;
      border: 1px solid #343a67; border-radius: 16px; background: #131d37;}
    h1 {font-size: 1.65rem; margin: 0 0 1rem;}
    p {color: #bbc6e5; line-height: 1.6;}
    .action {display: inline-block; margin-top: 1rem; padding: .85rem 1.1rem;
      border-radius: 9px; color: #fff; background: #6245df;
      font-weight: 700; text-decoration: none;}
    a:focus-visible {outline: 3px solid #66d9e8; outline-offset: 4px;}
    .secondary {display: block; margin-top: 1.5rem; color: #bcc9ff;}
  </style>
</head>
<body>
  <main>
    <h1>Access enabled</h1>
    <p>Private SafeHeal Cloud access enabled. Your sign-in was accepted.</p>
    <p>Continue to the AI Investigation workspace. Under
      <strong>Private Team Access</strong>, choose
      <strong>Run real Nemotron</strong> if you intend to make a live,
      credit-consuming inference request. No live request runs automatically.</p>
    <a class="action" href="/#analysis">Open AI Investigation</a>
    <a class="secondary" href="/">Return to the dashboard</a>
  </main>
</body>
</html>""",
        headers={
            "Content-Security-Policy": (
                "default-src 'none'; style-src 'unsafe-inline'; "
                "base-uri 'none'; form-action 'none'"
            )
        },
    )


# Preserve existing backend routes and middleware without rewriting them.
# All mounted endpoints are protected by the outer app's authentication.
app.mount("/", backend_app)
