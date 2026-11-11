"""True browser E2E smoke test of the public mock site.

Launches a real local Uvicorn server and Chromium. Never enables real Nebius,
never sends real credentials, and never runs the team's private model.
Usage after installing requirements-e2e.txt + Chromium:
    python e2e/browser_smoke.py
"""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DEMO_PASSWORD = "ci-only-browser-password-not-a-real-secret"


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _server(port: int) -> subprocess.Popen:
    env = os.environ.copy()
    env.update({
        "AI_MODE": "mock",
        "SAFEHEAL_ALLOW_LIVE_DEMO": "false",
        "SAFEHEAL_DEMO_PASSWORD": DEMO_PASSWORD,
        "SAFEHEAL_MAX_ANALYSES_PER_HOUR": "30",
    })
    # Do not inherit a developer's live API credentials for this test.
    env.pop("NEBIUS_API_KEY", None)
    env.pop("RUN_LIVE_TESTS", None)
    return subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "webapp.public:app",
         "--host", "127.0.0.1", "--port", str(port)],
        cwd=ROOT, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )


def _ready(server: subprocess.Popen, url: str) -> None:
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        if server.poll() is not None:
            details = server.stderr.read().decode("utf-8", "replace")[-4000:]
            raise RuntimeError("Local server exited before health check: " + details)
        try:
            with urllib.request.urlopen(url + "/api/health", timeout=1) as response:
                if json.load(response).get("status") == "ok":
                    return
        except (OSError, TimeoutError, ValueError):
            time.sleep(0.25)
    raise RuntimeError("Local health endpoint was not ready after 30 seconds")


def main() -> None:
    port = _free_port()
    url = f"http://127.0.0.1:{port}"
    server = _server(port)
    try:
        _ready(server, url)
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(accept_downloads=True, viewport={
                    "width": 1440, "height": 900,
                })

                # Visitors can use the demo without a login.
                page.goto(url, wait_until="domcontentloaded", timeout=20000)
                expect(page.locator("#modeText")).to_have_text("BACKEND CONNECTED", timeout=15000)

                # Real AI is unavailable unless explicitly enabled on the server.
                # This offline E2E must never send live model requests.
                disabled = page.request.post(url + "/web/team-nebius-demo")
                assert disabled.status == 503, disabled.status
                # Old password-protected links now take public visitors home.
                old_link = page.request.get(url + "/web/unlock")
                assert old_link.status == 200, old_link.status
                assert "SafeHeal" in old_link.text()

                # UI navigation, browser-side loading, actual backend mock,
                # evidence, patch validation and report export.
                # Force the explorer to Extended first. The bundled AI
                # workflow must then switch back to Classic evidence.
                page.locator('[data-page="threats"]').click()
                page.locator("#scenarioSelect + .sh-dropdown-trigger").click()
                page.locator('#sh-menu-scenarioSelect [role="option"][data-value="extended"]').click()
                expect(page.locator("#eventCount")).to_have_text("16", timeout=10000)
                page.locator('[data-page="analysis"]').click()
                page.locator("#loadDemo").click()
                expect(page.locator("#scenarioSelect")).to_have_value("classic")
                expect(page.locator("#settingsScenario")).to_have_value("classic")
                expect(page.locator("#eventCount")).to_have_text("3", timeout=10000)
                # The custom visual dropdown must reflect the same scenario
                # as the native selection, without reopening the menu.
                expect(page.locator("#scenarioSelect + .sh-dropdown-trigger .sh-dropdown-value")).to_contain_text("Classic")
                expect(page.locator("#dockerFileName")).to_have_text("Dockerfile", timeout=10000)
                page.locator("#analyzeBtn").click()
                expect(page.locator("#resultStatus")).to_have_text("COMPLETED", timeout=30000)
                assert "MOCK" in page.locator("#analysisModeLabel").inner_text()
                expect(page.locator("#analysisEvidence")).to_contain_text(
                    "Classic demo · 3 bundled synthetic events"
                )
                assert int(page.locator("#resultCount").inner_text()) >= 4
                assert int(page.locator("#resultCorr").inner_text()) >= 1
                assert "Proposed patch" in page.locator("#validationContent").inner_text()
                assert "PASS" in page.locator("#validationContent").inner_text()
                assert "USER " in page.locator("#patchCode").inner_text()

                # Explicit docs-capture workflow only. Capture PUBLIC mock analysis,
                # never the authenticated Nemotron route or any credential.
                if os.getenv("SAFEHEAL_CAPTURE_PREVIEW") == "1":
                    screenshot = ROOT / "assets" / "demo-preview.png"
                    screenshot.parent.mkdir(parents=True, exist_ok=True)
                    page.screenshot(path=str(screenshot), full_page=False)
                    print("Captured public mock demo preview.")


                # Docker Security must show the generated diff.
                page.locator('[data-page="docker"]').click()
                assert "USER " in page.locator("#secureCode").inner_text()
                assert "Dockerfile.proposed" in page.locator("#page-docker").inner_text() or (
                    "--- Dockerfile" in page.locator("#diffCode").inner_text()
                )

                # A real browser download contains the public, mock-only result.
                page.locator('[data-page="reports"]').click()
                with page.expect_download(timeout=15000) as download_info:
                    page.locator("#reportJSON").click()
                download = download_info.value
                assert download.suggested_filename == "SafeHeal-Cloud-investigation.json"
                with open(download.path(), encoding="utf-8") as f:
                    report = json.load(f)
                analysis = report["analysis"]
                assert analysis["status"] == "completed"
                assert analysis["ai"]["source"] == "mock"
                assert analysis["response"]["mode"] == "simulation"
                assert analysis["tests"]["proposed_patch"]["passed"] is True
                assert "no patch applied" in report["note"].lower()
                assert "Classic demo · 3 bundled synthetic events" in report["evidence_context"]

                # Extended is still selectable for independent monitoring,
                # but it must not silently relabel the existing AI result.
                page.locator('[data-page="threats"]').click()
                page.locator("#scenarioSelect + .sh-dropdown-trigger").click()
                page.locator('#sh-menu-scenarioSelect [role="option"][data-value="extended"]').click()
                expect(page.locator("#eventCount")).to_have_text("16", timeout=10000)
                page.locator('[data-page="analysis"]').click()
                expect(page.locator("#analysisEvidence")).to_contain_text(
                    "Classic demo · 3 bundled synthetic events"
                )
                # Simulate a sleepy hosting service: initial health requests
                # fail, then recover without reloading the dashboard. No live
                # Nebius inference is invoked and no browser secrets are used.
                recovering_page = browser.new_page(viewport={"width": 1440, "height": 900})
                failures = {"count": 0}

                def temporary_health_failure(route):
                    failures["count"] += 1
                    if failures["count"] <= 2:
                        route.fulfill(
                            status=503,
                            content_type="application/json",
                            body='{"detail":"Server waking up"}',
                        )
                    else:
                        route.continue_()

                recovering_page.route("**/api/health", temporary_health_failure)
                recovering_page.goto(url, wait_until="domcontentloaded", timeout=20000)
                expect(recovering_page.locator("#modeText")).to_have_text(
                    "RECONNECTING · AUTO RETRY", timeout=10000,
                )
                expect(recovering_page.locator("#modeText")).to_have_text(
                    "BACKEND CONNECTED", timeout=25000,
                )
                assert failures["count"] >= 3, failures
                expect(recovering_page.locator("#topologyBadge")).to_have_text(
                    "BACKEND DEMO DATA", timeout=10000,
                )
                recovering_page.locator('[data-page="analysis"]').click()
                recovering_page.locator("#loadDemo").click()
                expect(recovering_page.locator("#scenarioSelect")).to_have_value("classic")
                recovering_page.locator("#analyzeBtn").click()
                expect(recovering_page.locator("#resultStatus")).to_have_text(
                    "COMPLETED", timeout=30000,
                )
                assert "MOCK" in recovering_page.locator("#analysisModeLabel").inner_text()
                recovering_page.close()

                print("PASS: real Chromium browser mock E2E, Classic scenario alignment, automatic cold-start recovery, export and disabled-live-route protection.")
            finally:
                browser.close()
    finally:
        server.terminate()
        try:
            server.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
            server.communicate(timeout=5)


if __name__ == "__main__":
    main()
