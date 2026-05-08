FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci

FROM base AS builder
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]

FROM base AS dev
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
