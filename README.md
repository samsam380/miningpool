# Sam256 Mining Pool Preview

This repository now contains a **GitHub Pages frontend prototype** for your Bitcoin mining pool concept with:

- Pool mining mode
- Solo mining mode
- Config form for Stratum/RPC/worker/address inputs
- Dashboard cards for mode, estimated daily yield, and node endpoint
- Styling aligned with a dark, high-contrast "sam256" look-and-feel

## Run locally

Open `index.html` directly, or serve with any static server:

```bash
python3 -m http.server 8080
```

Then visit <http://localhost:8080>.

## GitHub Pages test deployment

A workflow is included at `.github/workflows/pages.yml`.

1. Push this repository to GitHub.
2. In GitHub repo settings, enable **Pages** with **GitHub Actions** as source.
3. Push to `main` to auto-deploy.

### If GitHub Actions fails with “Get Pages site failed / Not Found”

This repo includes `enablement: true` in the workflow so Pages can be auto-enabled.
If your run still fails once, open **Settings → Pages** and set **Source = GitHub Actions**, then rerun the workflow.


## What this prototype is (and is not)

✅ UI/UX and user flow test
✅ A place to validate your branding/theme on GitHub Pages

❌ Not a real mining backend yet
❌ No Stratum server, share accounting, payouts, authentication, or wallet ops in this repo yet

## Suggested migration path to your Contabo node server

1. Keep this static frontend hosted on GitHub Pages initially.
2. Build pool backend as separate services on your Contabo host (161.97.137.172):
   - Stratum service
   - Share processor/payment engine
   - API service for this frontend
3. Add an HTTPS reverse proxy (Nginx/Caddy) on the server.
4. Restrict Bitcoin RPC access to localhost/VPN/firewalled management IPs.
5. Move frontend to same domain when ready (or keep on Pages while API points to server).

## Info needed from you for next phase

To connect this UI to a real pool backend, I need:

- Preferred pool stack (e.g., NOMP-derived, ckpool, custom Node.js/Go/Rust)
- Target payout method (PPS, FPPS, PPLNS)
- User auth requirements (email/password, wallet-only, OAuth)
- Whether solo mode should be separate port/endpoint or account-level toggle
- TLS domain(s) you plan to use
