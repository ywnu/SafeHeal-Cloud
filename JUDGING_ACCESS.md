# SafeHeal Cloud — Judge Testing Guide

**Public demo:** https://safeheal-cloud.onrender.com/

Visitors do **not** need a username or password. The platform offers two explicit paths:

1. **AI Investigation → Load Classic demo Dockerfile + logs → Start AI Investigation:** free mock analysis, no Nebius charge.
2. **AI Investigation → Run real Nemotron → confirm:** a real Nebius inference request on fixed server-side Classic synthetic evidence. The result should show `ai.source = "nebius"`. The model response is not guaranteed to pass independent static patch review.

The public real-model flow requires `SAFEHEAL_ALLOW_LIVE_DEMO=true`, a valid server-side `NEBIUS_API_KEY`, and `NEBIUS_MODEL` in Render's environment settings. It can return HTTP 503 if not configured and HTTP 429 after the per-process call limit. The default live limit is 12 calls/hour per process; it is **not** a billing cap, and real requests use credits. Do not expose the Nebius key in the frontend or repository. If available, impose a provider-side spend allowance.

The public real-model endpoint uses **only built-in synthetic Dockerfile and three attack-log events**; it does not accept arbitrary user uploads. The Extended (16-event) monitoring sample is an independent explorer, not input to the fixed model route. The app never executes proposed Dockerfiles, applies patches, or blocks real IP addresses; any defensive actions are simulated. Public live telemetry is anonymized. Private raw feeds and API docs remain authenticated.

## Devpost testing instructions

- **Website:** https://safeheal-cloud.onrender.com/
- **Login:** Not required for the public demo or real Nemotron button.
- **Real model:** AI Investigation → Run real Nemotron → confirm. Verify `ai.source: nebius`, then inspect findings, correlations, proposed patch, and static review.
- **Free fallback:** Load Classic demo → Start AI Investigation, marked MOCK.
- **Known limitations:** Fixed synthetic evidence for live inference, application-side rate limits, and possible model/provider or hosting errors. No production blocking or patch execution.

For anyone on the project team needing protected admin routes, separate team credentials still exist; they must not be published or shared with general visitors.

**Availability:** The original rules in this project require the demo to remain accessible for judging until **December 15, 2026**. Verify the published Render service, server-side environment variables, live-model credits and model results before submitting the link.
