# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hub** is a centralized OAuth2/SSO authentication service for Severin Development. It integrates with corporate ADFS for authentication and acts as an OAuth2 provider for internal microservices.

**Key features:**
- SSO via corporate ADFS (OpenID Connect)
- OAuth2 provider for internal applications
- Application portal dashboard with search
- JWT-based session management (httpOnly cookies)
- User profile with ФИО from OIDC claims
- Admin panel with user/group/access management
- Excel export for users and applications

## Technology Stack

**Backend:**
- FastAPI 0.115.0
- SQLAlchemy 2.0.36 (async with asyncpg)
- PostgreSQL 15
- Alembic (migrations)
- python-jose (JWT)
- pydantic-settings
- httpx (async HTTP client)
- openpyxl (Excel export)

**Frontend:**
- React 19 + TypeScript
- React Router 7
- Zustand (state management)
- React Query 5.60 (data fetching)
- Axios (HTTP client)
- Tailwind CSS 3
- Lucide React (icons)
- Vite (bundler)

**Infrastructure:**
- Docker Compose
- GitHub Actions (CI/CD)
- Nginx (reverse proxy)
- Systemd (service management)

## Git Workflow

### Branches

| Branch | Purpose |
|--------|---------|
| `main` | Main development branch. All features merge here. |
| `release` | Production branch. **Push = auto-deploy.** Tags mark versions. |
| `feature/*` | New features (branch from main) |
| `fix/*` | Bug fixes (branch from main) |

### Release Process

1. Develop in feature branch: `git checkout -b feature/my-feature`
2. Test locally, merge to main: `git checkout main && git merge feature/my-feature`
3. Ready for prod? Merge main to release and tag:
   ```bash
   git checkout release
   git merge main
   git tag v1.2.0
   git push origin release --tags   # → auto-deploy
   ```
4. If something breaks, rollback:
   ```bash
   git checkout release
   git reset --hard v1.1.0
   git push origin release --force  # → redeploy old version
   ```

### Commit Messages

```
feat: add new feature
fix: bug fix
docs: documentation changes
refactor: code refactoring
chore: maintenance tasks
```

## Development Commands

**Docker (recommended):**
```bash
docker compose up -d                    # Start all services
docker compose down                     # Stop all
docker compose logs -f backend          # View logs
docker compose exec backend bash        # Shell into container
```

**Backend (standalone):**
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --port 8000
```

**Frontend (standalone):**
```bash
cd frontend
npm install
npm run dev
```

**Database migrations:**
```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

**Dev login (bypass SSO):**
```
http://localhost:5173/auth/dev-login
```
Three test roles available: Holder (super_admin), Admin, User.

## Deployment

### Auto-Deploy (GitHub Actions)

Push to `release` branch triggers automatic deployment:
1. SSH to production server
2. `git fetch && git reset --hard origin/release`
3. `docker compose build --no-cache`
4. `docker compose up -d`

**Note:** Push to `main` does NOT trigger deploy. Use `workflow_dispatch` for manual deploy from GitHub Actions UI.

**Required GitHub Secrets:**
- `SERVER_HOST` - production server IP
- `SERVER_USER` - SSH username
- `SSH_PRIVATE_KEY` - SSH private key

### Manual Deploy

```bash
ssh user@server
cd /opt/hub
git pull
sudo bash deploy/04-update.sh
```

### Deploy Scripts

| Script | Description |
|--------|-------------|
| `deploy/01-install-docker.sh` | Install Docker & Docker Compose |
| `deploy/02-setup-env.sh` | Create .env.prod, generate secrets |
| `deploy/03-deploy.sh` | Build and start containers |
| `deploy/04-update.sh` | Pull, rebuild, restart |
| `deploy/05-logs.sh` | View container logs |
| `deploy/06-stop.sh` | Stop all containers |
| `deploy/07-install-service.sh` | Install systemd service |
| `deploy/08-uninstall-service.sh` | Remove systemd service |
| `deploy/full-deploy.sh` | Complete setup (Docker + systemd) |

## Project Structure

```
Hub/
├── .github/workflows/
│   └── deploy.yml              # Auto-deploy on push to release branch
├── backend/
│   ├── src/
│   │   ├── main.py             # FastAPI app entry point
│   │   ├── core/
│   │   │   ├── config.py       # Settings (pydantic-settings)
│   │   │   ├── security.py     # JWT create/verify
│   │   │   └── dependencies.py # FastAPI dependencies
│   │   ├── db/
│   │   │   └── base.py         # Async SQLAlchemy engine
│   │   ├── models/
│   │   │   ├── user.py         # User model
│   │   │   ├── application.py  # OAuth2 client model
│   │   │   ├── oauth_token.py  # Codes and tokens
│   │   │   ├── user_group.py   # User groups
│   │   │   └── application_access.py  # Access control
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── application.py
│   │   │   ├── oauth.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── sso_service.py    # ADFS/OIDC integration
│   │   │   └── oauth_service.py  # OAuth2 token handling
│   │   └── api/
│   │       ├── auth.py         # SSO endpoints
│   │       ├── oauth.py        # OAuth2 provider
│   │       ├── applications.py # App management
│   │       └── admin.py        # Admin panel API
│   ├── alembic/
│   │   └── versions/           # Database migrations
│   ├── Dockerfile
│   ├── requirements.txt
│   └── alembic.ini
├── frontend/
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Router and protected routes
│   │   ├── api/
│   │   │   └── client.ts       # Axios HTTP client
│   │   ├── store/
│   │   │   └── auth.ts         # Zustand auth state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.tsx
│   │   │       ├── UsersAdmin.tsx
│   │   │       ├── GroupsAdmin.tsx
│   │   │       ├── AccessAdmin.tsx
│   │   │       └── ApplicationsAdmin.tsx
│   │   └── components/
│   │       ├── Layout.tsx
│   │       └── AppCard.tsx
│   ├── nginx.conf              # Production nginx config
│   ├── Dockerfile
│   └── package.json
├── deploy/                     # Deployment scripts
├── docker-compose.yml          # Development
└── docker-compose.prod.yml     # Production
```

## API Endpoints

### Auth (SSO)
```
GET  /auth/sso/login      → Redirect to ADFS
GET  /auth/sso/callback   → Handle ADFS response
GET  /auth/dev-login      → Dev-only bypass (3 roles available)
POST /auth/logout         → Clear session
GET  /auth/me             → Current user info
GET  /auth/check          → Check if authenticated
```

### OAuth2 Provider
```
GET  /oauth/authorize     → Authorization endpoint
POST /oauth/token         → Token endpoint (code→token, refresh_token→token)
GET  /oauth/userinfo      → User info (protected by access_token)
POST /oauth/revoke        → Revoke token (RFC 7009)
GET  /.well-known/openid-configuration → OIDC discovery
```

### Applications
```
GET    /api/applications      → List apps (portal)
POST   /api/applications      → Create app (admin)
GET    /api/applications/{id} → Get app details
PUT    /api/applications/{id} → Update (admin)
DELETE /api/applications/{id} → Delete/deactivate (admin)
POST   /api/applications/{id}/regenerate-secret → New secret (admin)
```

### Admin API
```
# User Management
GET    /api/admin/users                 → List with filtering
PATCH  /api/admin/users/{user_id}       → Update user
POST   /api/admin/users/bulk            → Bulk actions

# Group Management
GET    /api/admin/groups                → List groups
POST   /api/admin/groups                → Create group
PATCH  /api/admin/groups/{group_id}     → Update group
DELETE /api/admin/groups/{group_id}     → Delete group
POST   /api/admin/groups/{group_id}/members → Add member
DELETE /api/admin/groups/{group_id}/members/{user_id} → Remove member

# Access Control
GET    /api/admin/access                → List access rules
POST   /api/admin/access/grant          → Grant access
DELETE /api/admin/access/{access_id}    → Revoke access

# Admin Tools
GET    /api/admin/stats                 → Dashboard statistics
POST   /api/admin/cleanup-tokens        → Delete expired tokens
GET    /api/admin/export/{type}         → Export to Excel (users/apps)
```

## Database Models

### User
```python
id: UUID
sso_id: str              # From ADFS (sub claim)
email: str
display_name: str        # Full name from OIDC
first_name: str          # given_name claim
last_name: str           # family_name claim
middle_name: str         # middle_name claim
department: str
job_title: str
ad_groups: list[str]     # JSON
is_active: bool
is_admin: bool
is_super_admin: bool     # Can manage other admins
last_login_at: datetime
created_at: datetime
updated_at: datetime
# Relationships: groups, application_access
```

### Application
```python
id: UUID
name: str
slug: str
description: str
base_url: str
icon_url: str
client_id: str           # Auto-generated: hub_xxxxx
client_secret_hash: str  # SHA256 hash
redirect_uris: list[str] # JSON
is_active: bool
is_public: bool          # Visible in portal without access grant
created_at: datetime
updated_at: datetime
# Relationships: access_rules
```

### UserGroup
```python
id: UUID
name: str                # Unique
description: str
color: str               # Hex color for UI
created_by: UUID         # User who created
created_at: datetime
# Relationships: members (many-to-many with User), application_access
```

### ApplicationAccess
```python
id: UUID
application_id: UUID
user_id: UUID | None     # Either user_id OR group_id (exclusive)
group_id: UUID | None
granted_at: datetime
granted_by: UUID         # User who granted
# Constraint: Check(user_id IS NOT NULL OR group_id IS NOT NULL)
```

### OAuthCode
```python
id: UUID
code: str                # Random 64 chars
user_id: UUID
application_id: UUID
redirect_uri: str
scopes: str
state: str
expires_at: datetime     # 10 minutes from creation
used: bool
```

### OAuthToken
```python
id: UUID
access_token: str
refresh_token: str
user_id: UUID
application_id: UUID
scopes: str
expires_at: datetime     # 1 hour from creation
revoked_at: datetime | None
```

## Environment Variables

### Development (.env)
```bash
DATABASE_URL=postgresql+asyncpg://hub:hubpassword@localhost:5433/hub_db
SECRET_KEY=dev-secret-key-for-local-testing-only-32chars
OIDC_DISCOVERY_URL=https://sso.severindevelopment.ru/adfs/.well-known/openid-configuration
OIDC_CLIENT_ID=your-client-id
OIDC_CLIENT_SECRET=your-client-secret
OIDC_REDIRECT_URI=https://ai-hub.svrd.ru/signing-sso-...
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Production (.env.prod)
```bash
DOMAIN=ai-hub.svrd.ru
DB_PASSWORD=secure-password-here  # No $ signs!
SECRET_KEY=min-32-characters-secret-key
OIDC_DISCOVERY_URL=...
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=https://ai-hub.svrd.ru/signing-sso-...
CORS_ORIGINS=https://ai-hub.svrd.ru
```

## Architecture Notes

### Authentication Flow
1. User visits Hub → redirected to `/auth/sso/login`
2. Hub redirects to ADFS with state parameter
3. User authenticates with corporate credentials
4. ADFS redirects back to `/signing-sso-{uuid}` (callback)
5. Hub exchanges code for tokens, creates/updates user
6. JWT stored in httpOnly cookie `hub_session`

### OAuth2 Flow (for client applications)
1. Client redirects user to `/oauth/authorize?client_id=...&redirect_uri=...`
2. If not logged in → SSO flow first
3. Hub issues authorization code, redirects to client
4. Client exchanges code for tokens via `/oauth/token`
5. Client uses access_token to call `/oauth/userinfo`

### Security
- Session stored in httpOnly cookie (`hub_session`)
- Cookie `secure` flag auto-detected via `X-Forwarded-Proto` header
- SameSite=Lax prevents CSRF
- Client secrets hashed with SHA256
- Admin-only endpoints check `is_admin` flag
- Access control: user→app or group→app relationships

### Database
- All operations are async (SQLAlchemy + asyncpg)
- Connection pool: 20 connections, 10 overflow
- Pool health check: pre_ping=True

### Frontend
- Protected routes check auth state via `/auth/me`
- Admin routes require `is_admin` flag
- Nginx in prod proxies /api, /auth, /oauth to backend
- ADFS callback uses special URL: `/signing-sso-{uuid}` (registered in ADFS)

## Known Issues & TODOs

### Security
- [x] Token revocation (`/oauth/revoke`) - implemented per RFC 7009
- [ ] ID token signature verification not implemented
- [ ] No rate limiting on endpoints
- [ ] No audit logging for admin actions

### Features
- [ ] No pagination on large user lists
- [ ] No batch import for applications
- [ ] No login activity tracking per user

### Quality
- [ ] No unit tests
- [ ] No integration tests
- [ ] OpenAPI/Swagger not exposed in UI

## Troubleshooting

### "Failed to load applications"
1. Check backend logs: `docker compose logs backend`
2. Verify database has applications: `docker exec hub-postgres-1 psql -U hub -d hub_db -c "SELECT * FROM applications;"`
3. Check cookie is set (dev tools → Application → Cookies)

### 502 Bad Gateway
1. Backend container crashed - check logs
2. Database connection failed - verify DB_PASSWORD in .env.prod
3. Nginx can't reach backend - check docker network

### SSO Redirect Issues
1. OIDC_REDIRECT_URI must match ADFS registration exactly
2. Cookie secure flag - behind reverse proxy needs X-Forwarded-Proto header

### Database Issues
```bash
# Connect to database
docker exec -it hub-postgres-1 psql -U hub -d hub_db

# Check tables
\dt

# Check users
SELECT id, email, is_admin, is_super_admin FROM users;

# Check applications
SELECT id, name, client_id, is_active FROM applications;
```
