#!/bin/sh
set -e

# Substitute runtime env vars in /etc/nginx/conf.d/default.conf.
# Required because the config is now named nginx.conf (not *.template),
# so the nginx image's auto-envsubst script (20-envsubst-on-templates.sh)
# skips it. We only substitute the CSP env vars we actually use; leaving
# the default (all $VARs) would be unsafe.
envsubst '${FRAME_SRC} ${CONNECT_SRC}' \
    < /etc/nginx/conf.d/default.conf \
    > /tmp/default.conf
mv /tmp/default.conf /etc/nginx/conf.d/default.conf

# Hand off to nginx in the foreground so the container stays alive.
exec nginx -g 'daemon off;'