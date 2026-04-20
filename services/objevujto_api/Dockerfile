FROM node:20-bookworm-slim AS api-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace/objevujto_api
COPY objevujto_api/package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS api-build
WORKDIR /workspace/objevujto_api
COPY --from=api-deps /workspace/objevujto_api/node_modules ./node_modules
COPY objevujto_api ./
RUN npm run build

FROM node:20-bookworm-slim AS admin-deps
WORKDIR /workspace/objevujto_admin
COPY objevujto_admin/package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS admin-build
WORKDIR /workspace/objevujto_admin
COPY --from=admin-deps /workspace/objevujto_admin/node_modules ./node_modules
COPY objevujto_admin ./
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-build /workspace/objevujto_api/package*.json ./
COPY --from=api-build /workspace/objevujto_api/node_modules ./node_modules
COPY --from=api-build /workspace/objevujto_api/dist ./dist
COPY --from=api-build /workspace/objevujto_api/src ./src
COPY --from=admin-build /workspace/objevujto_admin/dist ./admin-dist
COPY objevujto_backend/data/seed_content.json ./seed_content.json
EXPOSE 8788
CMD ["node", "dist/src/server.js"]
