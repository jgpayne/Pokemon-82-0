# cloudflared's own image has no shell, so copy the binary onto alpine to let
# the entrypoint pick quick vs. named tunnel mode at runtime.
FROM cloudflare/cloudflared:2025.9.1 AS cloudflared
FROM alpine:3.20
COPY --from=cloudflared /usr/local/bin/cloudflared /usr/local/bin/cloudflared
COPY tunnel-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
