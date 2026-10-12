#!/bin/sh
# Prints the public trycloudflare.com link once the current quick tunnel is
# connected. Quick-tunnel URLs change on every restart, so only the most
# recent run's URL is considered.
latest_run() {
  docker compose logs --no-log-prefix tunnel 2>/dev/null |
    awk '/Starting free Cloudflare quick tunnel/ { buf = "" } { buf = buf $0 "\n" } END { printf "%s", buf }'
}

# Up to ~4 minutes: on networks that drop some port 7844 attempts, cloudflared
# can take a couple of minutes of retries before it connects.
for _ in $(seq 1 120); do
  run=$(latest_run)
  url=$(printf '%s' "$run" | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1)
  if [ -n "$url" ] && printf '%s' "$run" | grep -q 'Registered tunnel connection'; then
    echo "$url"
    exit 0
  fi
  sleep 2
done

if [ -n "$url" ]; then
  echo "Got $url but cloudflared never connected to Cloudflare (that URL will show error 1033)." >&2
else
  echo "No quick-tunnel URL yet." >&2
fi
echo "Check: docker compose logs tunnel (\"dial tcp ...:7844: i/o timeout\" means a firewall is blocking port 7844)" >&2
exit 1
