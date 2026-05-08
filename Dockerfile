FROM node:22-slim AS builder

WORKDIR /app

ENV NUXT_TELEMETRY_DISABLED=1

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=builder /app/.output ./.output

# Nitro serves generated public assets relative to the server chunks bundle in
# this build output, so keep a copy at the path used by the runtime asset map.
RUN mkdir -p .output/server/chunks/public \
  && cp -R .output/public/. .output/server/chunks/public/

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
