#!/bin/bash
# Hub - Uninstall systemd service
# Run: sudo bash 08-uninstall-service.sh

set -e

echo "=== Uninstalling Hub service ==="

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Run with sudo"
    exit 1
fi

# Stop and disable service
if systemctl is-active --quiet hub; then
    echo "Stopping Hub..."
    systemctl stop hub
fi

if systemctl is-enabled --quiet hub 2>/dev/null; then
    echo "Disabling Hub..."
    systemctl disable hub
fi

# Remove service file
if [ -f /etc/systemd/system/hub.service ]; then
    echo "Removing service file..."
    rm /etc/systemd/system/hub.service
    systemctl daemon-reload
fi

echo ""
echo "=== Service uninstalled ==="
echo ""
echo "Note: /opt/hub directory NOT removed. Delete manually if needed:"
echo "  rm -rf /opt/hub"
echo ""
