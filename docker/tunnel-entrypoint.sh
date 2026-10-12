#!/bin/sh
# Named tunnel when a token is provided (stable hostname you configure in the
# Cloudflare dashboard); otherwise a free, account-less quick tunnel on a
# random https://*.trycloudflare.com URL.
set -e
TARGET="${TUNNEL_TARGET:-http://web:80}"

if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
  echo "Starting named Cloudflare tunnel (hostname is set in your Cloudflare dashboard, pointing at $TARGET)"
  exec cloudflared tunnel --no-autoupdate run --token "$CLOUDFLARE_TUNNEL_TOKEN"
fi

echo "Starting free Cloudflare quick tunnel -> $TARGET"
echo "Your public link will appear below as https://<random>.trycloudflare.com"
exec cloudflared tunnel --no-autoupdate --url "$TARGET"
