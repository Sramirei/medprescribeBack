# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl openssl-dev

# ---- Dependencies (dev) ----
FROM base AS deps
COPY package*.json ./
RUN npm install

# ---- Dependencies (prod only) ----
FROM base AS deps-prod
COPY package*.json ./
RUN npm install --omit=dev

# ---- Development ----
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
EXPOSE 9000
CMD ["npm", "run", "start:dev"]

# ---- Builder ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production ----
FROM base AS production
ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy prod-only node_modules
COPY --from=deps-prod /app/node_modules ./node_modules

# Copy prisma schema + migrations (needed for migrate deploy)
COPY --from=builder /app/prisma ./prisma

# Copy package.json (needed by some runtimes)
COPY package*.json ./

# Re-generate prisma client targeting the production node_modules
RUN npx prisma generate

EXPOSE 9000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
