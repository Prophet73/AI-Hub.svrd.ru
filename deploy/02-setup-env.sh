#!/bin/bash
# Hub - Setup environment variables
# Run: bash 02-setup-env.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_DIR/.env.prod"

echo "=== Hub Environment Setup ==="

# Check if .env.prod already exists
if [ -f "$ENV_FILE" ]; then
    read -p ".env.prod already exists. Overwrite? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping .env.prod creation"
        exit 0
    fi
fi

# Domain
read -p "Enter domain (e.g., ai-hub.svrd.ru): " DOMAIN
DOMAIN=${DOMAIN:-ai-hub.svrd.ru}

# Email for SSL
read -p "Enter email for SSL certificates: " ACME_EMAIL
ACME_EMAIL=${ACME_EMAIL:-admin@svrd.ru}

# Generate random passwords
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
SECRET_KEY=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

# OIDC settings
echo ""
echo "=== OIDC/ADFS Settings ==="
read -p "OIDC Discovery URL: " OIDC_DISCOVERY_URL
OIDC_DISCOVERY_URL=${OIDC_DISCOVERY_URL:-https://sso.severindevelopment.ru/adfs/.well-known/openid-configuration}

read -p "OIDC Client ID: " OIDC_CLIENT_ID
read -p "OIDC Client Secret: " OIDC_CLIENT_SECRET
read -p "OIDC Redirect URI: " OIDC_REDIRECT_URI
OIDC_REDIRECT_URI=${OIDC_REDIRECT_URI:-https://$DOMAIN/signing-sso-019b2e1d-b49e-7926-ae0a-a5592d035bc0}

# Create .env.prod
cat > "$ENV_FILE" << EOF
# Domain
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

# Database
DB_PASSWORD=$DB_PASSWORD

# JWT
SECRET_KEY=$SECRET_KEY

# OIDC (ADFS)
OIDC_DISCOVERY_URL=$OIDC_DISCOVERY_URL
OIDC_CLIENT_ID=$OIDC_CLIENT_ID
OIDC_CLIENT_SECRET=$OIDC_CLIENT_SECRET
OIDC_REDIRECT_URI=$OIDC_REDIRECT_URI

# CORS
CORS_ORIGINS=https://$DOMAIN
EOF

chmod 600 "$ENV_FILE"

echo ""
echo "=== .env.prod created ==="
echo "File: $ENV_FILE"
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo "DB_PASSWORD: $DB_PASSWORD"
echo "SECRET_KEY: $SECRET_KEY"
