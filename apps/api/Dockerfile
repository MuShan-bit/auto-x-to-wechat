ARG NODE_IMAGE=node:20-bookworm-slim
FROM ${NODE_IMAGE}

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV DISPLAY=":99"
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD="1"
ENV COREPACK_NPM_REGISTRY="https://registry.npmmirror.com"
ENV npm_config_registry="https://registry.npmmirror.com"
ENV PRISMA_ENGINES_MIRROR="https://registry.npmmirror.com/-/binary/prisma"

RUN corepack enable
RUN sed -i \
    's|http://deb.debian.org/debian|http://mirrors.aliyun.com/debian|g; s|http://deb.debian.org/debian-security|http://mirrors.aliyun.com/debian-security|g' \
    /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    chromium \
    fonts-liberation \
    fonts-noto-cjk \
    fonts-noto-color-emoji \
    fluxbox \
    novnc \
    websockify \
    x11vnc \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter api build
RUN chmod +x /app/apps/api/scripts/start-with-desktop.sh

EXPOSE 3001 6080

CMD ["/app/apps/api/scripts/start-with-desktop.sh"]
