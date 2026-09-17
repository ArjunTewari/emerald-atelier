FROM node:22-bookworm-slim

RUN npm install --global @openai/codex@latest && npm cache clean --force

WORKDIR /app
COPY package.json ./package.json
COPY output-schema.json ./output-schema.json
COPY server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=8080
USER node

EXPOSE 8080
CMD ["node", "server.mjs"]
