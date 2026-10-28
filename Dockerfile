# syntax=docker/dockerfile:1

# ---------- dependencias ----------
FROM node:24-slim AS deps
WORKDIR /app
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM deps AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate && npm run build

# ---------- runtime ----------
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl curl && rm -rf /var/lib/apt/lists/*
# Se copian las dependencias de `build` porque ya incluyen el Prisma Client
# generado por `prisma generate`; copiarlas de `deps` deja el cliente sin generar.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# El seed usa tsx y comparte el constructor de snapshots con src/.
COPY --from=build /app/src ./src
COPY package.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
