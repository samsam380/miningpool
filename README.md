# Sam256 Bitcoin Mining Pool (Production Deployment Repo)

This repository includes a deployable stack for a Bitcoin mining pool service with both shared-pool and solo modes.

## What is included

- **Mining backend**: Miningcore (Stratum + API + payout engine), built from source in Docker
- **Databases**: PostgreSQL + Redis
- **Web layer**: Nginx serving the Sam256 frontend and proxying `/api/*` to Miningcore
- **Frontend**: `index.html`, `styles.css`, `app.js` for pool/solo UX and live stat pull
- **Ops**: `docker-compose.yml`, `scripts/setup-production.sh`, `.env.example`, and baseline `miningcore/config.json`

## Ports

- `3333` -> BTC pool mining stratum
- `3334` -> BTC solo mining stratum
- `3052` -> Miningcore API (internal via Nginx proxy)
- `8080` -> Web UI

## Quick start on your Contabo server

```bash
git clone https://github.com/samsam380/miningpool.git
cd miningpool
cp .env.example .env
# edit .env and miningcore/config.json with real secrets + wallet + RPC creds
./scripts/setup-production.sh
```

## Important: update your server after every merge

Yes, after merging updates on GitHub you should update the server copy:

```bash
cd /opt/miningpool
git pull origin main
```

You usually **do not** need to delete and re-clone the repo, unless your local folder is broken.

## Fix for your current registry denied error

Your logs show image pull errors from `ghcr.io/...` and `coinfoundry/miningcore`.
This repo now builds Miningcore from source locally in Docker, so no external Miningcore image pull is required.

After pulling latest changes, run:

```bash
cd /opt/miningpool
git pull origin main
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```


## Fix for GitVersion "unshallow clone" build error

If build fails with `GitVersionException ... Please ensure that the repository is an unshallow clone`,
it means Miningcore was cloned with insufficient history.
This repo now performs a full clone in `miningcore/Dockerfile`, which resolves that error.

After pulling latest changes, rebuild without cache once:

```bash
cd /opt/miningpool
git pull origin main
docker compose build --no-cache miningcore
./scripts/setup-production.sh
```

## Required edits before real mining

1. `miningcore/config.json`
   - Replace placeholders:
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

Recommended production approach:

- Keep this repository as your service source.
- Run Docker stack on Contabo.
- Put Nginx/Caddy in front with TLS certificate for `sam256.com`.
- Reverse proxy `/mining/` to this web container (`localhost:8080`).

## Important notes

- First build can take several minutes because Miningcore is compiled in Docker.
- Miningcore currently targets .NET 6, so the runtime image is pinned to .NET 6 in `miningcore/Dockerfile`.
- Perform security review, payment dry-runs, and low-hashrate soak tests before scaling.
