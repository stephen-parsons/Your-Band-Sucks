# Build stage
FROM node:20-alpine AS build
WORKDIR /app

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/bin ./bin
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/databaseUrl.ts ./databaseUrl.ts
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "./bin/www"]
