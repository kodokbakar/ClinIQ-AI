FROM oven/bun:1.3.14-alpine

WORKDIR /repo

COPY package.json bun.lock ./

COPY apps/api/package.json ./apps/api/package.json
COPY apps/docs/package.json ./apps/docs/package.json
COPY apps/web/package.json ./apps/web/package.json

COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN bun ci --production

COPY apps/api ./apps/api

ENV NODE_ENV=production
ENV PORT=8080

WORKDIR /repo/apps/api

EXPOSE 8080

USER bun

CMD ["bun", "index.js"]