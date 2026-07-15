#!/bin/bash

# Cloudflare Tunnel Setup Script
# Run this once to configure the tunnel

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$PROJECT_ROOT/config.yml"
CREDS_DIR="/root/.cloudflared"
TUNNEL_NAME="hgcrm-lead"

echo "Setting up Cloudflare Tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."

    # Detect OS and install
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux - download binary
        curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
        chmod +x /usr/local/bin/cloudflared
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install cloudflared
    fi
fi

# Create credentials directory
mkdir -p "$CREDS_DIR"

# Login to Cloudflare (opens browser)
echo "Please login to Cloudflare..."
cloudflared tunnel login

# Create the tunnel
echo "Creating tunnel: $TUNNEL_NAME"
cloudflared tunnel create "$TUNNEL_NAME"

# Copy credentials to expected location
cp ~/.cloudflared/*.json "$CREDS_DIR/credentials.json" 2>/dev/null || true

# Get the tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
echo "Tunnel ID: $TUNNEL_ID"

# Update config.yml with actual tunnel ID
sed -i "s/^tunnel:.*/tunnel: $TUNNEL_ID/" "$CONFIG_FILE"

# Route domain through Cloudflare dashboard:
# 1. Go to Cloudflare Dashboard > your domain > DNS
# 2. Add CNAME record: yourdomain.com -> <tunnel-id>.cfargotunnel.com
# 3. Add CNAME record: api.yourdomain.com -> <tunnel-id>.cfargotunnel.com

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add CNAME records in Cloudflare Dashboard:"
echo "   - yourdomain.com -> ${TUNNEL_ID}.cfargotunnel.com"
echo "   - api.yourdomain.com -> ${TUNNEL_ID}.cfargotunnel.com"
echo ""
echo "2. Run tunnel manually for testing:"
echo "   cloudflared tunnel --config config.yml run"
echo ""
echo "3. Or install as systemd service (production):"
echo "   sudo cloudflared service install"
echo "   sudo cp config.yml /etc/cloudflared/config.yml"
echo "   sudo systemctl start cloudflared"