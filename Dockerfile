FROM node:lts-alpine3.21 AS base

ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package.json pnpm-lock.yaml ./

RUN corepack enable && corepack prepare pnpm@10.12.1 --activate

FROM base AS installer

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder

COPY --from=installer /usr/src/app/node_modules ./node_modules
COPY . .

RUN pnpm prisma generate && pnpm build && pnpm prune --production --ignore-scripts

FROM base AS runner

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist/src ./dist
COPY --from=builder /usr/src/app/prisma ./prisma

RUN mkdir uploads

USER node

ENTRYPOINT [ "sh", "-c", "node dist/main.js" ]
