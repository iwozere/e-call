# Build from the monorepo root (not from backend/ alone):
#   docker build -f backend/Dockerfile .
#
# linux/arm64 (Raspberry Pi 5):
#   docker build --platform linux/arm64 -f backend/Dockerfile -t ecall-backend .

FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci -w backend

FROM deps AS build
COPY backend/tsconfig.json ./backend/
COPY backend/src ./backend/src
RUN npm run build -w backend

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
RUN npm ci -w backend --omit=dev && npm cache clean --force
COPY --from=build /app/backend/dist ./backend/dist
RUN chown -R node:node /app
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "backend/dist/index.js"]
