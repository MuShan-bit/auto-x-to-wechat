FROM mcr.microsoft.com/playwright:v1.58.2-noble

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter api exec prisma generate --schema prisma/schema.prisma
RUN pnpm --filter api build

EXPOSE 3001

CMD ["pnpm", "--filter", "api", "start:prod"]
