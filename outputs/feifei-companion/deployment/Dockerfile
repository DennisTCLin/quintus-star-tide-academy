FROM node:22.12-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY restore-static.mjs restore-static.json ./
RUN node restore-static.mjs && rm restore-static.mjs restore-static.json
COPY dist ./dist
COPY build ./build
COPY server ./server
COPY server.mjs ./server.mjs
COPY src ./src
EXPOSE 3000
CMD ["node", "server.mjs"]
