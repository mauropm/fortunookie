# ---- Build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Regenerate + validate content so the image always ships a verified library.
RUN npm run generate:fortunes && npm run validate:fortunes && npm run build

# ---- Runtime stage (static files only, non-root) ----------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
# The unprivileged image runs as uid 101 and listens on 8080.
ENV NGINX_SERVER_NAME=fortunookie.example.com
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
