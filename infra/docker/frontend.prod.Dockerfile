FROM node:20-alpine AS deps

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app/frontend

ARG NEXT_PUBLIC_APP_BASE_PATH=/karaoke-ia
ENV NEXT_PUBLIC_APP_BASE_PATH=${NEXT_PUBLIC_APP_BASE_PATH}

COPY --from=deps /app/frontend/node_modules ./node_modules
COPY frontend ./

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/next.config.mjs ./next.config.mjs

EXPOSE 3000

CMD ["npm", "run", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
