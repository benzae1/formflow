FROM node:24-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts

RUN npm ci
RUN npx prisma generate

COPY . .

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

RUN npm run build

EXPOSE 3000

CMD ["npm", "start", "--", "--hostname", "0.0.0.0", "--port", "3000"]
