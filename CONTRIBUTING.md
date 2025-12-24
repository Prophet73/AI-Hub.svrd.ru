# Contributing to Hub

## Git Workflow

### Branch Strategy

```
main (production)
  │
  ├── release/v1.x.x (release branches)
  │     │
  │     └── feature/*, fix/* (merged into release)
  │
  └── feature/*, fix/* (hotfixes direct to main)
```

### Branch Naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feature/<short-description>` | `feature/add-user-roles` |
| Bug fix | `fix/<issue-or-description>` | `fix/login-redirect` |
| Release | `release/v<major>.<minor>.<patch>-<name>` | `release/v1.1.0-user-names` |
| Hotfix | `hotfix/<description>` | `hotfix/security-patch` |

### Workflow

#### New Feature / Bug Fix

```bash
# 1. Create branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature

# 2. Develop and commit
git add .
git commit -m "feat: add my feature"

# 3. Push and create PR
git push -u origin feature/my-feature
# Create PR on GitHub
```

#### Release Process

```bash
# 1. Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.2.0-new-feature

# 2. Merge features/fixes into release
git merge feature/my-feature
git merge fix/some-bug

# 3. Test thoroughly
# - Run locally
# - Check all functionality
# - Review code changes

# 4. Merge to main
git checkout main
git merge release/v1.2.0-new-feature
git push origin main

# 5. Tag release (optional)
git tag v1.2.0
git push origin v1.2.0

# 6. Delete release branch
git branch -d release/v1.2.0-new-feature
git push origin --delete release/v1.2.0-new-feature
```

#### Hotfix (urgent production fix)

```bash
# 1. Create from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug

# 2. Fix and commit
git add .
git commit -m "fix: critical bug description"

# 3. Merge directly to main
git checkout main
git merge hotfix/critical-bug
git push origin main

# 4. Cleanup
git branch -d hotfix/critical-bug
```

---

## Commit Messages

Use conventional commits format:

```
<type>: <description>

[optional body]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```bash
feat: add user name fields (first, last, middle)
fix: correct secure cookie flag detection
docs: update deployment instructions
refactor: extract auth logic to service
chore: update dependencies
```

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (or use Docker)

### Local Development

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
alembic upgrade head
uvicorn src.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

### Docker Development

```bash
docker-compose up -d
```

---

## Code Style

### Backend (Python)

- Follow PEP 8
- Use type hints
- Async functions for DB operations
- Pydantic models for validation

### Frontend (TypeScript/React)

- Use TypeScript strictly
- Functional components with hooks
- Zustand for state management
- Tailwind CSS for styling

---

## Testing

### Before Merging

1. Run backend locally and verify:
   - SSO login works
   - Applications load
   - OAuth flow works

2. Run frontend and check:
   - Login page renders
   - Dashboard shows applications
   - User info displays correctly

3. Test in Docker:
   ```bash
   docker-compose up --build
   ```

---

## Deployment

### Automatic (recommended)

Push to `main` triggers GitHub Actions auto-deploy.

### Manual

```bash
ssh user@10.0.6.66
cd /opt/hub
sudo bash deploy/04-update.sh
```

See [deploy/README.md](deploy/README.md) for details.

---

## Database Migrations

### Create Migration

```bash
cd backend
alembic revision --autogenerate -m "description"
```

### Apply Migration

```bash
alembic upgrade head
```

### Rollback

```bash
alembic downgrade -1
```

### Production Migration

Migrations run automatically on container startup via Docker entrypoint.

---

## Troubleshooting

### Backend won't start

1. Check database connection
2. Verify environment variables
3. Check logs: `docker compose logs backend`

### Frontend can't reach API

1. Check CORS_ORIGINS in .env
2. Verify nginx proxy config
3. Check backend is running

### SSO redirect issues

1. Verify OIDC_REDIRECT_URI matches exactly
2. Check ADFS application registration
3. Ensure cookies are set correctly

---

## Contact

For questions or issues:
- Create GitHub issue
- Contact Severin Development team
