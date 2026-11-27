# worker image. Build from the repository root: docker build -f worker/Dockerfile .
FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY db/package.json db/
COPY api/package.json api/
COPY worker/package.json worker/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN npm ci --omit=dev --workspace worker --ignore-scripts && npm cache clean --force

FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY db/package.json db/
COPY db/src db/src
# The worker shares the JobQueue interface and health helpers with the api (contract C3).
COPY api/package.json api/
COPY api/src api/src
COPY api/openapi api/openapi
COPY worker/package.json worker/
COPY worker/src worker/src
USER node
EXPOSE 3001
CMD ["node", "worker/src/main.ts"]
