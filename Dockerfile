FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node package.json ./
COPY --chown=node:node server ./server
COPY --chown=node:node public ./public
COPY --chown=node:node html/images ./html/images
COPY --chown=node:node html/videos ./html/videos
RUN mkdir -p /var/data && chown node:node /var/data
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/var/data COOKIE_SECURE=true
USER node
EXPOSE 3000
CMD ["node", "server/index.mjs"]
