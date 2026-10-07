FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/dist ./public
COPY server.mjs ./server.mjs
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.mjs"]
