"""Offline tests for public mock mode and protected live Nebius access."""
import base64

import pytest
from fastapi.testclient import TestClient

from backend.live_events import record_event
from webapp.public import app, _attempts, _live_attempts, _attempts_lock


def credentials(username="demo", password="a-long-demo-password-123"):
    encoded = base64.b64encode(f"{username}:{password}".encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


@pytest.fixture(autouse=True)
def secure_test_env(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_DEMO_PASSWORD", "a-long-demo-password-123")
    monkeypatch.setenv("SAFEHEAL_DEMO_USERNAME", "demo")
    monkeypatch.delenv("SAFEHEAL_JUDGE_USERNAME", raising=False)
    monkeypatch.delenv("SAFEHEAL_JUDGE_PASSWORD", raising=False)
    monkeypatch.setenv("SAFEHEAL_MAX_ANALYSES_PER_HOUR", "8")
    monkeypatch.setenv("AI_MODE", "mock")
    with _attempts_lock:
        _attempts.clear()
        _live_attempts.clear()
    monkeypatch.delenv("SAFEHEAL_ALLOW_LIVE_DEMO", raising=False)
    monkeypatch.delenv("NEBIUS_API_KEY", raising=False)
    monkeypatch.delenv("NEBIUS_MODEL", raising=False)


def test_anonymous_health_is_available():
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.parametrize("path", [
    "/",
    "/web/assets/app.js",
    "/web/assets/styles.css",
    "/web/demo-dockerfile",
    "/web/demo-analysis",
    "/web/live-events",
    "/api/attack-events",
])
def test_public_routes_open_without_password(path):
    with TestClient(app) as client:
        response = client.get(path)
    assert response.status_code == 200
    assert "www-authenticate" not in response.headers


@pytest.mark.parametrize("path", ["/api/live-events", "/api/live-events/stream", "/docs", "/openapi.json"])
def test_private_routes_still_require_password(path):
    with TestClient(app) as client:
        response = client.get(path)
    assert response.status_code == 401
    assert "www-authenticate" not in response.headers


def test_public_old_unlock_link_redirects_home_without_login():
    with TestClient(app) as client:
        redirect = client.get("/web/unlock", follow_redirects=False)
        page = client.get("/web/unlock")
    assert redirect.status_code == 302
    assert redirect.headers["location"] == "/"
    assert "www-authenticate" not in redirect.headers
    assert page.status_code == 200
    assert "SafeHeal" in page.text


def test_bad_credentials_redirect_to_public_home():
    with TestClient(app) as client:
        response = client.get(
            "/web/unlock",
            headers=credentials(password="wrong-password"),
            follow_redirects=False,
        )
    assert response.status_code == 302
    assert response.headers["location"] == "/"


def test_authorized_users_can_unlock_private_route():
    with TestClient(app) as client:
        response = client.get("/web/unlock", headers=credentials())
    assert response.status_code == 200
    assert "Private SafeHeal Cloud access enabled" in response.text
    assert response.headers["content-type"].startswith("text/html")
    assert 'href="/#analysis"' in response.text
    assert "Open AI Investigation" in response.text
    assert "Run real Nemotron" in response.text
    assert "credit-consuming" in response.text
    assert "no-store" in response.headers["cache-control"]
    assert "default-src 'none'" in response.headers["content-security-policy"]
    assert "a-long-demo-password-123" not in response.text


def test_judge_unlock_and_public_mock_are_available(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_JUDGE_USERNAME", "judges")
    monkeypatch.setenv("SAFEHEAL_JUDGE_PASSWORD", "judge-only-long-password-456")
    with TestClient(app) as client:
        unlock = client.get(
            "/web/unlock", headers=credentials("judges", "judge-only-long-password-456")
        )
        public = client.get("/web/demo-analysis")
    assert unlock.status_code == 200
    assert 'href="/#analysis"' in unlock.text
    assert "judge-only-long-password-456" not in unlock.text
    assert public.status_code == 200
    assert public.json()["ai"]["source"] == "mock"


@pytest.mark.parametrize("method,path", [
    ("GET", "/api/live-events"),
    ("GET", "/api/live-events/stream"),
    ("GET", "/docs"),
    ("GET", "/openapi.json"),
    ("POST", "/api/analyze"),
])
def test_judges_cannot_access_other_private_endpoints(monkeypatch, method, path):
    monkeypatch.setenv("SAFEHEAL_JUDGE_USERNAME", "judges")
    monkeypatch.setenv("SAFEHEAL_JUDGE_PASSWORD", "judge-only-long-password-456")
    headers = credentials("judges", "judge-only-long-password-456")
    # /api/analyze is public only while AI_MODE=mock; in live mode it is private.
    monkeypatch.setenv("AI_MODE", "live")
    with TestClient(app) as client:
        response = client.request(method, path, headers=headers)
    assert response.status_code == 403


def test_unconfigured_judge_credentials_cannot_unlock_private_page():
    with TestClient(app) as client:
        response = client.get(
            "/web/unlock",
            headers=credentials("judges", "judge-only-long-password-456"),
            follow_redirects=False,
        )
    assert response.status_code == 302
    assert response.headers["location"] == "/"


@pytest.mark.parametrize("username,password", [
    ("judges", ""),
    ("", "judge-only-long-password-456"),
    ("judges", "short"),
    ("demo", "judge-only-long-password-456"),
])
def test_invalid_judge_configuration_fails_closed(monkeypatch, username, password):
    monkeypatch.setenv("SAFEHEAL_JUDGE_USERNAME", username)
    monkeypatch.setenv("SAFEHEAL_JUDGE_PASSWORD", password)
    with pytest.raises(RuntimeError, match="JUDGE"):
        with TestClient(app):
            pass


def test_judge_can_run_only_fixed_synthetic_real_demo(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_JUDGE_USERNAME", "judges")
    monkeypatch.setenv("SAFEHEAL_JUDGE_PASSWORD", "judge-only-long-password-456")
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    captured = []

    def fake_analysis(dockerfile, logs, settings):
        assert settings.mode == "live"
        assert "EXPOSE 22" in dockerfile
        assert any(e.get("event_type") == "PORT_SCAN" for e in logs)
        captured.append(True)
        return {
            "status": "completed", "findings": [], "correlations": [],
            "patch": {"patched_dockerfile": "", "diff": "", "summary": ""},
            "ai": {"source": "nebius", "error": None},
        }

    monkeypatch.setattr("webapp.public.analyze_evidence", fake_analysis)
    headers = credentials("judges", "judge-only-long-password-456")
    with TestClient(app) as client:
        result = client.post(
            "/web/team-nebius-demo", headers={**headers, "Origin": "https://testserver"}
        )
        private = client.get("/api/live-events", headers=headers)
    assert result.status_code == 200
    assert result.json()["ai"]["source"] == "nebius"
    assert result.json()["response"]["mode"] == "simulation"
    assert captured == [True]
    assert private.status_code == 403


def test_judge_live_route_denies_cross_origin(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_JUDGE_USERNAME", "judges")
    monkeypatch.setenv("SAFEHEAL_JUDGE_PASSWORD", "judge-only-long-password-456")
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    with TestClient(app) as client:
        response = client.post(
            "/web/team-nebius-demo",
            headers={
                **credentials("judges", "judge-only-long-password-456"),
                "Origin": "https://attacker.example",
            },
        )
    assert response.status_code == 403


def test_anonymous_public_probe_is_harmless():
    with TestClient(app) as client:
        response = client.get("/api/debug/demo")
    assert response.status_code == 404


def test_public_live_feed_does_not_expose_client_ip_or_path():
    record_event("SUSPICIOUS_HTTP_REQUEST", "192.0.2.45", "/api/debug/secret-path")
    with TestClient(app) as client:
        response = client.get("/web/live-events?after_id=0")
    assert response.status_code == 200
    assert response.json()["privacy"] == "anonymized"
    assert "192.0.2.45" not in response.text
    assert "secret-path" not in response.text
    assert any(event["source_ip"] == "REDACTED" for event in response.json()["events"])


def test_cannot_read_python_files_as_public_assets():
    with TestClient(app) as client:
        response = client.get("/web/assets/public.py", headers=credentials())
    assert response.status_code == 404


def test_mock_analysis_is_public_without_password():
    dockerfile = b'FROM python:3.9-slim\nRUN useradd -m appuser\nUSER appuser\nCMD ["python", "app.py"]\n'
    with TestClient(app) as client:
        response = client.post(
            "/api/analyze",
            files={"dockerfile": ("Dockerfile", dockerfile)},
        )
    assert response.status_code == 200
    assert response.json()["status"] == "completed"
    assert response.json()["ai"]["source"] == "mock"


def test_server_side_demo_is_mock_and_matches_existing_contract():
    with TestClient(app) as client:
        response = client.get("/web/demo-analysis")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["ai"]["source"] == "mock"
    assert len(data["findings"]) >= 3
    assert "proposed_patch" in data["tests"]


def test_demo_endpoint_never_calls_live_nebius(monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    with TestClient(app) as client:
        response = client.get("/web/demo-analysis")
        authed = client.get("/web/demo-analysis", headers=credentials())
    assert response.status_code == 403
    assert authed.status_code == 403
    assert "live mode" in response.json()["detail"]


def test_demo_route_respects_analysis_rate_limit(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_MAX_ANALYSES_PER_HOUR", "1")
    with TestClient(app) as client:
        first = client.get("/web/demo-analysis")
        second = client.get("/web/demo-analysis")
    assert first.status_code == 200
    assert second.status_code == 429


def test_real_nebius_analysis_requires_password_without_calling_nebius(monkeypatch):
    monkeypatch.setenv("AI_MODE", "live")
    with TestClient(app) as client:
        response = client.post(
            "/api/analyze",
            files={"dockerfile": ("Dockerfile", b"FROM alpine\n")},
        )
    assert response.status_code == 401
    assert "www-authenticate" not in response.headers


def test_public_mock_analysis_rate_limit(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_MAX_ANALYSES_PER_HOUR", "1")
    with TestClient(app) as client:
        first = client.post(
            "/api/analyze",
            files={"dockerfile": ("Dockerfile", b"FROM alpine\nUSER 1000\n")},
        )
        second = client.post(
            "/api/analyze",
            files={"dockerfile": ("Dockerfile", b"FROM alpine\nUSER 1000\n")},
        )
    assert first.status_code == 200
    assert second.status_code == 429


def test_missing_password_fails_closed(monkeypatch):
    monkeypatch.delenv("SAFEHEAL_DEMO_PASSWORD")
    with pytest.raises(RuntimeError, match="SAFEHEAL_DEMO_PASSWORD"):
        with TestClient(app):
            pass


def test_public_nebius_demo_requires_explicit_opt_in():
    with TestClient(app) as client:
        response = client.post("/web/team-nebius-demo")
    assert response.status_code == 503
    assert "not enabled" in response.json()["detail"]
    assert "www-authenticate" not in response.headers


def test_team_nebius_demo_fails_closed_when_not_enabled():
    with TestClient(app) as client:
        response = client.post("/web/team-nebius-demo", headers=credentials())
    assert response.status_code == 503
    assert "not enabled" in response.json()["detail"]


def test_team_nebius_demo_requires_configuration(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    with TestClient(app) as client:
        response = client.post("/web/team-nebius-demo")
    assert response.status_code == 503
    assert "configuration" in response.json()["detail"]


def test_public_nebius_demo_rejects_cross_origin(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    with TestClient(app) as client:
        response = client.post(
            "/web/team-nebius-demo",
            headers={"Origin": "https://evil.example"},
        )
    assert response.status_code == 403


def test_team_nebius_demo_injects_live_settings_without_mutating_public_mode(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    modes = []

    def fake_analyze(dockerfile, logs, settings):
        modes.append(settings.mode)
        assert "EXPOSE 22" in dockerfile
        assert any(event["event_type"] == "PORT_SCAN" for event in logs)
        return {
            "status": "completed",
            "findings": [],
            "correlations": [],
            "patch": {
                "patched_dockerfile": "FROM python:3.9-slim\\nUSER appuser\\nEXPOSE 5000",
                "summary": "Test stub",
                "diff": "",
            },
            "ai": {
                "source": "nebius",
                "model": "test-model",
                "error": None,
                "patch_status": "proposed_not_validated",
            },
        }

    monkeypatch.setattr("webapp.public.analyze_evidence", fake_analyze)
    with TestClient(app) as client:
        live = client.post("/web/team-nebius-demo")
        public = client.get("/web/demo-analysis")
    assert live.status_code == 200
    assert live.json()["ai"]["source"] == "nebius"
    assert live.json()["tests"]["proposed_patch"]["status"] == "static_review_only"
    assert live.json()["response"]["mode"] == "simulation"
    assert modes == ["live"]
    assert public.status_code == 200
    assert public.json()["ai"]["source"] == "mock"


def test_team_nebius_demo_uses_separate_rate_limit(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    monkeypatch.setenv("SAFEHEAL_MAX_LIVE_ANALYSES_PER_HOUR", "1")
    monkeypatch.setattr("webapp.public.analyze_evidence", lambda *args: {
        "status": "ai_error", "findings": [], "correlations": [],
        "patch": {"patched_dockerfile": "", "summary": "", "diff": ""},
        "ai": {"source": "nebius", "error": {"code": "test_error", "message": "fake"}, "patch_status": "none"},
    })
    with TestClient(app) as client:
        first = client.post("/web/team-nebius-demo")
        second = client.post("/web/team-nebius-demo")
        public = client.get("/web/demo-analysis")
    assert first.status_code == 200
    assert second.status_code == 429
    assert public.status_code == 200

def test_enabling_public_live_keeps_private_routes_protected(monkeypatch):
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")
    with TestClient(app) as client:
        private = client.get("/api/live-events")
        docs = client.get("/docs")
        unlock = client.get("/web/unlock")
    assert private.status_code == 401
    assert docs.status_code == 401
    assert "www-authenticate" not in private.headers
    assert "www-authenticate" not in docs.headers
    assert unlock.status_code == 200
    assert "www-authenticate" not in unlock.headers


def test_private_button_has_branded_spacing_and_confirmation():
    with TestClient(app) as client:
        page = client.get("/").text
        script = client.get("/web/assets/app.js").text
        styles = client.get("/web/assets/styles.css").text
    assert 'class="team-access-panel"' in page
    assert 'id="teamNebiusBtn"' in page
    assert 'id="teamConfirmDialog"' in page
    assert "function confirmRealAI()" in script
    assert "dialog.showModal()" in script
    assert ".team-nebius-button" in styles
    assert ".team-confirm-dialog" in styles



def test_private_live_patch_disagreement_is_reported_as_failure(monkeypatch):
    """Prevent the previously observed false PASS on a malformed patch."""
    monkeypatch.setenv("SAFEHEAL_ALLOW_LIVE_DEMO", "true")
    monkeypatch.setenv("NEBIUS_API_KEY", "dummy-not-real")
    monkeypatch.setenv("NEBIUS_MODEL", "test-model")

    def fake_analysis(*args):
        return {
            "status": "completed",
            "findings": [], "correlations": [],
            "patch": {
                "patched_dockerfile": (
                    "FROM python:3.9-slim\n"
                    "WORKDIR /app\\n\n"
                    "RUN useradd -m appuser\nUSER appuser\nEXPOSE 5000\n"
                ),
                "summary": "Demo", "diff": "",
            },
            "ai": {
                "source": "nebius", "finding_evidence": {},
                "warnings": [], "patch_status": "proposed_not_validated",
            },
        }

    monkeypatch.setattr("webapp.public.analyze_evidence", fake_analysis)
    with TestClient(app) as client:
        response = client.post("/web/team-nebius-demo", headers=credentials())
    assert response.status_code == 200
    data = response.json()
    assert data["tests"]["proposed_patch"]["passed"] is False
    assert data["ai"]["patch_review"]["passed"] is False
    assert data["ai"]["patch_status"] == "proposed_failed_static_review"
    assert any("literal" in detail for detail in data["tests"]["proposed_patch"]["details"])


def test_combined_patch_review_can_pass_when_both_reviews_pass():
    from backend.validator import review_proposed_patch

    original = "FROM alpine\nEXPOSE 22\n"
    result = {
        "patch": {"patched_dockerfile": "FROM alpine\nUSER 1000\nEXPOSE 5000\n"},
        "tests": {}, "ai": {"warnings": []},
    }
    review_proposed_patch(original, result)
    assert result["tests"]["proposed_patch"]["passed"] is True
    assert result["ai"]["patch_review"]["passed"] is True
    assert result["ai"]["patch_status"] == "proposed_not_validated"
