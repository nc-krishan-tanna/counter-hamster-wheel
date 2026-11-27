# web images: Caddy serving the built pages and proxying /v1, /mcp and /api/auth to the api.
# Build from the repository root:
#   docker build -f web/Dockerfile --target web .          (self-hosted and local, stock Caddy)
#   docker build -f web/Dockerfile --target web-hosted .   (the team's hosted copy, DNS challenge)
ARG CADDY_VERSION=2.10

FROM node:26-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY db/package.json db/
COPY api/package.json api/
COPY worker/package.json worker/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN npm ci --workspace web --include-workspace-root
COPY tsconfig.base.json ./
COPY web web
RUN npm run build --workspace web

# The DNS provider's Caddy module for the wildcard certificate; Cloudflare by default.
FROM caddy:${CADDY_VERSION}-builder-alpine AS xcaddy
ARG DNS_MODULE=github.com/caddy-dns/cloudflare
RUN xcaddy build --with ${DNS_MODULE}

FROM caddy:${CADDY_VERSION}-alpine AS web
RUN apk add --no-cache libcap \
  && setcap cap_net_bind_service=+ep /usr/bin/caddy \
  && addgroup -S caddy && adduser -S -G caddy caddy \
  && mkdir -p /data /config && chown -R caddy:caddy /data /config
COPY --from=build /app/web/dist /srv
COPY deploy/caddy-routes.caddy /etc/caddy/caddy-routes.caddy
COPY deploy/Caddyfile /etc/caddy/Caddyfile
USER caddy

FROM web AS web-hosted
USER root
COPY --from=xcaddy /usr/bin/caddy /usr/bin/caddy
RUN setcap cap_net_bind_service=+ep /usr/bin/caddy
COPY deploy/Caddyfile.hosted /etc/caddy/Caddyfile
USER caddy
