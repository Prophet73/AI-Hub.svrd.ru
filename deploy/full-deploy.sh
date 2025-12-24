#!/bin/bash
# Hub - Full deployment script (all-in-one)
# Deploys Hub on a fresh Ubuntu server
# Run: sudo bash full-deploy.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INSTALL_DIR="/opt/hub"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "       Hub Full Deployment Script        "
echo "=========================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}ERROR: Run with sudo${NC}"
    exit 1
fi

# Get the actual user (not root)
REAL_USER="${SUDO_USER:-$USER}"

###########################################
# Step 1: Install Docker CE
###########################################
echo -e "${YELLOW}[1/5] Installing Docker CE...${NC}"

if command -v docker &> /dev/null; then
    echo "Docker already installed: $(docker --version)"
else
    # Remove old versions
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
        apt-get remove -y $pkg 2>/dev/null || true
    done

    # Install dependencies
    apt-get update
    apt-get install -y ca-certificates curl

    # Add Docker GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add repository
    cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

    # Install Docker CE
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start Docker
    systemctl start docker
    systemctl enable docker

    # Add user to docker group
    usermod -aG docker "$REAL_USER"

    echo -e "${GREEN}Docker CE installed!${NC}"
fi

###########################################
# Step 2: Setup environment
###########################################
echo ""
echo -e "${YELLOW}[2/5] Setting up environment...${NC}"

if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    if [ -f "$PROJECT_DIR/.env.prod.example" ]; then
        cp "$PROJECT_DIR/.env.prod.example" "$PROJECT_DIR/.env.prod"
        echo -e "${RED}Created .env.prod from example. Please edit it!${NC}"
        echo "nano $PROJECT_DIR/.env.prod"
        exit 1
    else
        echo -e "${RED}ERROR: No .env.prod or .env.prod.example found!${NC}"
        exit 1
    fi
fi

# Load and validate env
source "$PROJECT_DIR/.env.prod"
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}ERROR: DOMAIN not set in .env.prod${NC}"
    exit 1
fi
echo "Domain: $DOMAIN"

###########################################
# Step 3: Copy to /opt/hub
###########################################
echo ""
echo -e "${YELLOW}[3/5] Installing to $INSTALL_DIR...${NC}"

mkdir -p "$INSTALL_DIR"
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='.env' \
    "$PROJECT_DIR/" "$INSTALL_DIR/"

chown -R "$REAL_USER:$REAL_USER" "$INSTALL_DIR"
echo -e "${GREEN}Files copied!${NC}"

###########################################
# Step 4: Install systemd service
###########################################
echo ""
echo -e "${YELLOW}[4/5] Installing systemd service...${NC}"

cp "$SCRIPT_DIR/hub.service" /etc/systemd/system/hub.service
systemctl daemon-reload
systemctl enable hub.service
echo -e "${GREEN}Service installed!${NC}"

###########################################
# Step 5: Build and start
###########################################
echo ""
echo -e "${YELLOW}[5/5] Building and starting Hub...${NC}"

cd "$INSTALL_DIR"
docker compose -f docker-compose.prod.yml --env-file .env.prod build
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Wait for startup
echo "Waiting for services..."
sleep 10

###########################################
# Done!
###########################################
echo ""
echo -e "${GREEN}=========================================="
echo "         Hub deployed successfully!       "
echo "==========================================${NC}"
echo ""
docker compose -f docker-compose.prod.yml ps
echo ""
echo "URL: https://$DOMAIN"
echo ""
echo "Commands:"
echo "  systemctl status hub     - Check status"
echo "  systemctl restart hub    - Restart"
echo "  journalctl -u hub -f     - View logs"
echo ""
echo -e "${YELLOW}Note: SSL certificate may take 1-2 minutes${NC}"
echo ""
