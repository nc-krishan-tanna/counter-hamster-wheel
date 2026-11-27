# migrate image: one-shot migrations, policies, grants, job queue setup and seed, as ce_migrate.
# Build from the repository root: docker build -f db/Dockerfile .
FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY db/package.json db/
COPY api/package.json api/
COPY worker/package.json worker/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN npm ci --omit=dev --workspace db --ignore-scripts && npm cache clean --force

FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY db/package.json db/
COPY db/src db/src
USER node
CMD ["node", "db/src/migrate.ts"]
