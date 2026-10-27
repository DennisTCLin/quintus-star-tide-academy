FROM node:22.12-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22.12-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.mjs ./server.mjs
COPY --from=build /app/server ./server
COPY --from=build /app/build ./build
COPY --from=build /app/src/data/interface-zhuyin.json ./src/data/interface-zhuyin.json
COPY --from=build /app/src/data/dragon-vocabulary.json ./src/data/dragon-vocabulary.json
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "server.mjs"]
