# ---- deps + source ----
FROM node:22-alpine AS base
WORKDIR /app
RUN corepack enable
COPY package.json ./
RUN pnpm install
COPY . .

# ---- dev: vite dev server with HMR (source bind-mounted by compose) ----
FROM base AS dev
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ---- build: produce static assets ----
FROM base AS build
RUN pnpm build

# ---- prod: nginx serves the static build + proxies /api ----
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
