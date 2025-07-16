# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Verify Prisma client was generated
RUN ls -la node_modules/.prisma/client/ || echo "Prisma client not found in expected location"
RUN find node_modules -name "*.d.ts" -path "*prisma*" | head -5

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src ./src

# Build TypeScript to JavaScript
RUN npm run build

# List generated files for debugging
RUN ls -la dist/

# Production stage
FROM node:20-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copy node_modules/.prisma from builder (contains generated client)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema and migrations
COPY --chown=nodejs:nodejs prisma ./prisma

# Generate Prisma client for production (in case .prisma copy failed)
RUN npx prisma generate

# Create uploads directory (if using local storage)
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Create credentials directory for Google Cloud
RUN mkdir -p /app/credentials && chown -R nodejs:nodejs /app/credentials

# Switch to non-root user
USER nodejs

# Expose port (matching fly.toml configuration)
EXPOSE 4000

# Set production environment
ENV NODE_ENV=production
ENV PORT=4000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/app.js"]