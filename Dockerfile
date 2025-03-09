FROM node:alpine3.20 AS builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY prisma ./prisma

COPY . .

RUN npx prisma generate && \
    npm run build

FROM node:alpine3.20

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma ./prisma 

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
