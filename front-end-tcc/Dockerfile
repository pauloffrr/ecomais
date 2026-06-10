FROM node:20-bookworm-slim

WORKDIR /app

ENV CI=1
ENV EXPO_NO_TELEMETRY=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

EXPOSE 8081

CMD ["npx", "expo", "start", "--lan", "--port", "8081"]
