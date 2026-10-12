#!/bin/sh
# Prints the public trycloudflare.com link once the quick tunnel is up.
for _ in $(seq 1 30); do
  url=$(docker compose logs tunnel 2>/dev/null | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
  if [ -n "$url" ]; then
    echo "$url"
    exit 0
  fi
  sleep 2
done
echo "No quick-tunnel URL yet. Check: docker compose logs tunnel" >&2
exit 1
