#!/bin/bash
# Hub - Install Docker CE (Community Edition) on Ubuntu
# Source: https://docs.docker.com/engine/install/ubuntu/
# Run: sudo bash 01-install-docker.sh

set -e

echo "=== Installing Docker CE (Community Edition) ==="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: Run with sudo"
    exit 1
fi

# Uninstall old versions
echo "Removing old Docker versions..."
for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    apt-get remove -y $pkg 2>/dev/null || true
done

# Update and install dependencies
echo ""
echo "Installing dependencies..."
apt-get update
apt-get install -y ca-certificates curl

# Add Docker's official GPG key
echo ""
echo "Adding Docker GPG key..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources (DEB822 format)
echo ""
echo "Adding Docker repository..."
cat > /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# Install Docker CE
echo ""
echo "Installing Docker CE..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
echo ""
echo "Starting Docker service..."
systemctl start docker
systemctl enable docker

# Add current user to docker group (so no sudo needed)
if [ -n "$SUDO_USER" ]; then
    usermod -aG docker "$SUDO_USER"
    echo ""
    echo "User '$SUDO_USER' added to docker group."
fi

# Verify installation
echo ""
echo "=== Verifying installation ==="
docker --version
docker compose version

echo ""
echo "=== Docker CE installed successfully ==="
echo ""
echo "IMPORTANT: Log out and log back in for group changes to take effect!"
echo "Or run: newgrp docker"
echo ""
