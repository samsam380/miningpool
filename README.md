# Sam256 Bitcoin Mining Pool (Production Deployment Repo)

This repository now includes a deployable stack for a real Bitcoin mining pool service with both shared-pool and solo modes.

## What is included

- **Mining backend**: Miningcore (Stratum + API + payout engine)
- **Databases**: PostgreSQL + Redis
- **Web layer**: Nginx serving the Sam256 frontend and proxying `/api/*` to Miningcore
- **Frontend**: `index.html`, `styles.css`, `app.js` for pool/solo UX, miner profile helpers, and live stat pull
- **Ops**: `docker-compose.yml`, `scripts/setup-production.sh`, `.env.example`, and baseline `miningcore/config.json`

## Ports

- `3333` -> BTC pool mining stratum
- `3334` -> BTC solo mining stratum
- `3052` -> Miningcore API (internal via Nginx proxy)
- `8080` -> Web UI

## Quick start on your Contabo server

```bash
git clone <your-repo-url>
cd miningpool
cp .env.example .env
# edit .env and miningcore/config.json with real secrets + wallet + RPC creds
./scripts/setup-production.sh
```

Then point rented hashpower to:

- Pool mode: `stratum+tcp://<server-ip>:3333`
- Solo mode: `stratum+tcp://<server-ip>:3334`

## Required edits before real mining

1. `miningcore/config.json`
   - Replace all placeholder values:
     - RPC user/password
     - payout wallet address
     - pool fee recipient addresses
2. `.env`
   - Replace PostgreSQL credentials with strong passwords
3. Bitcoin node
   - Ensure RPC is reachable from Docker network/server
   - Restrict RPC by firewall/IP allowlist
4. OS/network hardening
   - Open only required ports
   - Add HTTPS reverse proxy for `sam256.com/mining/`
   - Enable fail2ban/ufw and monitoring/alerts

## Deploying behind sam256.com/mining/

The recommended production approach is:

- Keep this repository as your service source.
- Run Docker stack on Contabo.
- Put Nginx/Caddy in front with TLS certificate for `sam256.com`.
- Reverse proxy `/mining/` to this web container (`localhost:8080`).

## Important notes

- This stack is a practical production baseline, but you should still perform full security review, payment dry-runs, and testnet soak tests before large hashrate.
- Start with small hashrate for validation, verify payouts, then scale.
