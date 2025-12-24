# Hub Deployment Guide

## Quick Deploy (All-in-One)

```bash
# 1. Clone repo to server
git clone https://github.com/Prophet73/AUTH-AI.SVRD.RU.git /opt/hub
cd /opt/hub

# 2. Configure environment
cp .env.prod.example .env.prod
nano .env.prod   # Edit settings!

# 3. Run full deploy
sudo bash deploy/full-deploy.sh
```

Done! Hub will be available at `https://YOUR_DOMAIN`

---

## Auto-Deploy (GitHub Actions)

Push to `main` branch triggers automatic deployment.

### Setup GitHub Secrets

Go to: Repository → Settings → Secrets and variables → Actions

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | `10.0.6.66` (or your server IP) |
| `SERVER_USER` | SSH username (e.g., `nkhromenok`) |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/id_rsa` |

### How it works

1. Push to `main` → GitHub Actions triggered
2. SSH to server
3. `git pull` → `docker compose build` → `docker compose up -d`
4. Done!

---

## Manual Update

```bash
cd /opt/hub
git pull
sudo bash deploy/04-update.sh
```

Or step by step:
```bash
cd /opt/hub
git pull
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache
sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## Scripts Reference

| Script | Description | Run as |
|--------|-------------|--------|
| `full-deploy.sh` | Complete deployment (Docker + systemd) | sudo |
| `01-install-docker.sh` | Install Docker CE | sudo |
| `02-setup-env.sh` | Create .env.prod interactively | user |
| `03-deploy.sh` | Build and start containers | user/sudo |
| `04-update.sh` | Pull, rebuild, restart | user/sudo |
| `05-logs.sh` | View container logs | user/sudo |
| `06-stop.sh` | Stop all containers | user/sudo |
| `07-install-service.sh` | Install systemd service | sudo |
| `08-uninstall-service.sh` | Remove systemd service | sudo |

---

## Systemd Service Commands

After installing service with `07-install-service.sh`:

```bash
sudo systemctl start hub       # Start Hub
sudo systemctl stop hub        # Stop Hub
sudo systemctl restart hub     # Restart Hub
sudo systemctl status hub      # Check status
sudo journalctl -u hub -f      # View logs
```

Hub will auto-start on server reboot.

---

## Environment Variables (.env.prod)

```bash
# Domain
DOMAIN=ai-hub.svrd.ru

# Database (NO special chars like $ in password!)
DB_PASSWORD=SecurePassword2024

# JWT Secret (min 32 chars)
SECRET_KEY=your-very-secure-secret-key-min-32-chars

# OIDC/ADFS
OIDC_DISCOVERY_URL=https://sso.example.com/adfs/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://ai-hub.svrd.ru/signing-sso-xxx

# CORS
CORS_ORIGINS=https://ai-hub.svrd.ru
```

**Important:** Don't use `$` in DB_PASSWORD - it gets interpreted as a variable!

---

## Adding Applications to Database

After deploy, the database is empty. Add applications:

```bash
sudo docker exec -it hub-postgres-1 psql -U hub -d hub_db -c "
INSERT INTO applications (id, name, slug, description, base_url, client_id, client_secret_hash, redirect_uris, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'MyApp', 'myapp', 'My Application', 'https://myapp.example.com', gen_random_uuid()::text, 'placeholder', ARRAY['https://myapp.example.com/callback'], true, now(), now());
"
```

---

## Troubleshooting

### Check container status
```bash
sudo docker compose -f docker-compose.prod.yml ps
```

### View logs
```bash
sudo docker compose -f docker-compose.prod.yml logs -f
sudo docker compose -f docker-compose.prod.yml logs backend --tail 50
```

### Backend keeps restarting
1. Check logs for errors
2. Verify DB_PASSWORD matches in .env.prod and postgres
3. If password mismatch, reset database:
   ```bash
   sudo docker compose -f docker-compose.prod.yml down -v
   sudo docker volume rm hub_postgres_data
   sudo docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   ```

### 502 Bad Gateway
1. Backend not running - check `docker ps`
2. Backend crashed - check logs
3. Nginx can't reach backend - verify docker network

### "Failed to load applications"
1. User not authenticated - check cookies
2. Database empty - add applications
3. Backend error - check logs

---

## Architecture

```
                    ┌─────────────────┐
                    │  Reverse Proxy  │
                    │ (nginx/traefik) │
                    │  :443 HTTPS     │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  hub-frontend   │
                    │  nginx :80      │
                    │  (static + proxy)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     /api/*   │    /auth/*   │   /oauth/*   │
              │              │              │
              └──────────────┼──────────────┘
                             │
                    ┌────────▼────────┐
                    │  hub-backend    │
                    │  uvicorn :8000  │
                    │  (FastAPI)      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  hub-postgres   │
                    │  postgres :5432 │
                    └─────────────────┘
```

---

## Security Notes

- `.env.prod` contains secrets - never commit to git!
- SSH keys for deploy should be read-only on server
- Database not exposed externally (internal docker network only)
- All cookies are httpOnly with secure flag
