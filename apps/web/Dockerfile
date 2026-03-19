FROM node:20-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="replace-with-a-long-random-string"
ENV AUTH_TRUST_HOST="true"
ENV INTERNAL_API_BASE_URL="http://api:3001"
ENV INTERNAL_API_SHARED_SECRET="replace-with-an-internal-shared-secret"
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/auto_x_to_wechat?schema=public"

RUN corepack enable
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter web exec next build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "exec", "next", "start", "-p", "3000"]
