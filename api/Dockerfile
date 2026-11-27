# api image. Build from the repository root: docker build -f api/Dockerfile .
# Node.js runs the TypeScript sources directly (built-in type stripping), so there is no build step.
FROM node:26-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY db/package.json db/
COPY api/package.json api/
COPY worker/package.json worker/
COPY web/package.json web/
COPY e2e/package.json e2e/
RUN npm ci --omit=dev --workspace api --ignore-scripts && npm cache clean --force

FROM node:26-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules node_modules
COPY package.json ./
COPY db/package.json db/
COPY db/src db/src
COPY api/package.json api/
COPY api/src api/src
COPY api/openapi api/openapi
USER node
EXPOSE 3000
CMD ["node", "api/src/main.ts"]
