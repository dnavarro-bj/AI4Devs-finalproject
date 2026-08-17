# Frontend - Nuxt 4 / Vue 3 (yarn)

# ---- Build stage ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ---- Runtime stage ----
FROM node:22-alpine
WORKDIR /app
ENV NITRO_PORT=3000 NITRO_HOST=0.0.0.0
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
