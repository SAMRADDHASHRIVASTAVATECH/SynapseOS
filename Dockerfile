FROM node:20-alpine AS builder

WORKDIR /app

# Copy configuration
COPY package.json package-lock.json tsconfig.base.json ./

# Copy workspaces and configs
COPY packages ./packages
COPY config ./config
COPY data/migrations ./data/migrations

# Ensure fresh resolution of workspaces in Alpine Linux
RUN rm -f package-lock.json && npm install

# Build the API and Web dashboard
RUN npm run build

# --- Production Image ---
FROM node:20-alpine

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3847

# Copy the entire built workspace from the builder
COPY --from=builder /app ./

# Setup data directory for SQLite persistence
RUN mkdir -p /app/data && chown -R node:node /app/data

# Switch to non-root user for security
USER node

# Expose the API port
EXPOSE 3847

# Startup command: run database migrations, then start the API (which also serves the compiled Web UI)
CMD npm run migrate && npm start
