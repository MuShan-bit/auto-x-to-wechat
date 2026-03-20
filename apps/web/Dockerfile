ARG NODE_IMAGE=node:20-bookworm-slim
FROM ${NODE_IMAGE}

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"
ENV COREPACK_NPM_REGISTRY="https://registry.npmmirror.com"
ENV npm_config_registry="https://registry.npmmirror.com"
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXTAUTH_SECRET="replace-with-a-long-random-string"
ENV AUTH_TRUST_HOST="true"
ENV INTERNAL_API_BASE_URL="http://api:3001"
ENV INTERNAL_API_SHARED_SECRET="replace-with-an-internal-shared-secret"
ENV DATABASE_URL="postgresql://postgres:postgres@db:5432/auto_x_to_wechat?schema=public"

RUN corepack enable
RUN sed -i \
    's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g; s|http://deb.debian.org/debian-security|http://mirrors.aliyun.com/debian-security|g' \
    /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter web exec next build

EXPOSE 3000

CMD ["pnpm", "--filter", "web", "exec", "next", "start", "-p", "3000"]
