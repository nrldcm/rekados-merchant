# syntax=docker/dockerfile:1

# ---- Build stage ----------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (better layer caching).
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# Copy source and build the Nitro server output.
COPY . .
RUN npm run build

# ---- Runtime stage --------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NITRO_PORT=3002
ENV NITRO_HOST=0.0.0.0
# Override at runtime to point at your deployed backend.
ENV NUXT_PUBLIC_API_BASE=http://localhost:3001/api/v1

# Only the built output is needed at runtime.
COPY --from=build /app/.output ./.output

# Run as the built-in non-root node user.
USER node

EXPOSE 3002
CMD ["node", ".output/server/index.mjs"]
