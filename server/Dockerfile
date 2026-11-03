# Production Dockerfile for Dispatchly Express Backend
FROM node:20-alpine AS base

# Install necessary OS utilities
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY src ./src

# Create uploads directory and set permissions for non-root user
RUN mkdir -p uploads && chown -R node:node /app

# Switch to non-root user
USER node

# Expose default backend port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Start server
CMD ["node", "src/server.js"]
