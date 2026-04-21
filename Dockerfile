# Multi-stage build für optimierte Größe und Performance
FROM node:20-slim as builder

WORKDIR /app

# Installiere Dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Kopiere Source Code
COPY . .

# Baue die Anwendung (ohne db:push)
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Installiere nur Production Dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps --omit=dev

# Kopiere Build-Output vom Builder
COPY --from=builder /app/dist ./dist

# Kopiere notwendige Konfigurationsdateien
COPY drizzle ./drizzle
COPY drizzle.config.ts ./

# Setze Umgebungsvariablen
ENV NODE_ENV=production

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3000) + '/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start-Befehl: Starte Server direkt (nutze ENV Variable NODE_ENV)
CMD ["node", "dist/index.js", "--port=${PORT:-3000}"]
