# Frontend - Nuxt 4 / Vue 3 (yarn)
#
# Node 24: el runner de tests que entra con T-05 arrastra dependencias que declaran
# `engines: ^22.22.2 || ^24.15.0 || >=26`, y `node:22-alpine` se queda en 22.19. Es ademas la
# version con la que se desarrolla el proyecto.

# ---- Build stage ----
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

# ---- Runtime stage ----
FROM node:24-alpine
WORKDIR /app
ENV NITRO_PORT=3000 NITRO_HOST=0.0.0.0
COPY --from=build /app/.output ./.output
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
