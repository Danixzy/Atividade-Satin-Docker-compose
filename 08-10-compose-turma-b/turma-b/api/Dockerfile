FROM node:24-alpine
WORKDIR /app
COPY package.json server.ts ./
RUN mkdir -p /app/registros
EXPOSE 3000
CMD ["node", "server.ts"]
