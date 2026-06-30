FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm install --production

COPY client/package*.json ./client/
RUN cd client && npm install

COPY client/ ./client/
RUN cd client && npm run build

COPY server/ ./server/

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "server/index.js"]
