FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate
COPY . .
RUN pnpm install --frozen-lockfile --prod=false && pnpm db:generate && pnpm --filter @erp/api... build
RUN cp deploy/api/start.mjs ./start.mjs && cp deploy/api/storage-probe.mjs ./storage-probe.mjs
ENV NODE_ENV=production
ENV ERP_API_ENTRY=./apps/api/dist/server.js
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate:deploy && node start.mjs"]
