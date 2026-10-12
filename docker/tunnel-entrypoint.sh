#!/bin/sh
# Named tunnel when a token is provided (stable hostname you configure in the
# Cloudflare dashboard); otherwise a free, account-less quick tunnel on a
# random https://*.trycloudflare.com URL.
#
# Defaults to HTTP/2 over TCP 443: cloudflared's default QUIC transport needs
# outbound UDP 7844, which many home routers and Docker Desktop setups drop,
# leaving the URL up but unconnected (Cloudflare error 1033).
set -e
TARGET="${TUNNEL_TARGET:-http://web:80}"
PROTOCOL="${TUNNEL_PROTOCOL:-http2}"
# /ready on this port backs the container healthcheck.
COMMON="--no-autoupdate --protocol $PROTOCOL --metrics 0.0.0.0:2000"

if [ -n "$CLOUDFLARE_TUNNEL_TOKEN" ]; then
  echo "Starting named Cloudflare tunnel over $PROTOCOL (hostname is set in your Cloudflare dashboard, pointing at $TARGET)"
  # shellcheck disable=SC2086
  exec cloudflared tunnel $COMMON run --token "$CLOUDFLARE_TUNNEL_TOKEN"
fi

echo "Starting free Cloudflare quick tunnel over $PROTOCOL -> $TARGET"
echo "Your public link will appear below as https://<random>.trycloudflare.com"
# shellcheck disable=SC2086
exec cloudflared tunnel $COMMON --url "$TARGET"
