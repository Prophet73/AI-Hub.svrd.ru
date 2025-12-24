#!/bin/bash
# Hub - Install systemd service for auto-start
# Run: sudo bash 07-install-service.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INSTALL_DIR="/opt/hub"

echo "=== Installing Hub as systemd service ==="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Run with sudo"
    exit 1
fi

# Check .env.prod
if [ ! -f "$PROJECT_DIR/.env.prod" ]; then
    echo "ERROR: .env.prod not found!"
    echo "Run first: bash deploy/02-setup-env.sh"
    exit 1
fi

# Create install directory
echo "Creating $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

# Copy project files
echo "Copying project files..."
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='venv' \
    --exclude='__pycache__' \
    --exclude='.env' \
    "$PROJECT_DIR/" "$INSTALL_DIR/"

# Install systemd service
echo "Installing systemd service..."
cp "$SCRIPT_DIR/hub.service" /etc/systemd/system/hub.service
systemctl daemon-reload
systemctl enable hub.service

echo ""
echo "=== Service installed ==="
echo ""
echo "Commands:"
echo "  systemctl start hub      - Start"
echo "  systemctl stop hub       - Stop"
echo "  systemctl restart hub    - Restart"
echo "  systemctl status hub     - Status"
echo "  journalctl -u hub -f     - Logs"
echo ""
echo "Start now with: systemctl start hub"
echo ""
