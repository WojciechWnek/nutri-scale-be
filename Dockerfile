# Stage 1: Base (Enable pnpm)
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage 2: Dependencies
FROM base AS deps
WORKDIR /app

# Copy lockfile and package.json first to leverage Docker caching
COPY pnpm-lock.yaml package.json ./
# Use --frozen-lockfile to ensure the build is reproducible
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
WORKDIR /app

# Copy node_modules from deps stage and the rest of the source
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (Must be done before build)
RUN pnpm prisma generate

# Build the application
RUN pnpm run build

# ---

# Stage 4: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Re-enable corepack in the runner if you need to run pnpm commands (like migrations)
RUN corepack enable

# Copy necessary artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Expose port
EXPOSE 8000

# Start the application
CMD ["node", "dist/src/main"]