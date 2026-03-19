# auto-x-to-wechat

一个围绕 X 推荐流内容沉淀场景打造的 Web 软件：支持绑定真实 X 账号登录态，定时抓取推荐内容，按账号与帖子 ID 去重归档，并在页面中以富文本卡片和运行记录的形式持续展示。

## 项目亮点

- 真实 X 绑定：通过浏览器辅助绑定或容器 noVNC 远程桌面完成手动登录，系统自动回填账号信息和 Cookie。
- 推荐流抓取：基于 Playwright 打开真实 `x.com/home` 页面抓取推荐内容。
- 去重归档：按 `binding account + xPostId` 去重，避免重复抓取与重复存档。
- 富文本展示：帖子正文、媒体、来源链接、关系信息会被标准化后存档，并支持分页浏览与详情查看。
- 运行记录：展示每次抓取的触发方式、抓取统计、错误摘要和明细。
- 中英双语与主题切换：前端支持中文 / English 切换，以及亮色 / 暗色主题。

## 演示截图

### 概览页

![概览页截图](docs/assets/overview-light.png)

### 绑定页

![绑定页截图](docs/assets/bindings-dark.png)

## 当前功能

### 已完成的 MVP 能力

- 账号登录与会话管理：基于 NextAuth.js + Prisma Adapter。
- X 绑定管理：支持查看当前绑定、更新绑定、停用绑定、解除绑定。
- 浏览器辅助绑定：支持创建绑定会话、打开真实浏览器登录页、自动回填 Cookie 与用户资料。
- 抓取调度：支持定时任务扫描、手动触发抓取、抓取运行记录写入。
- 推荐流归档：支持标准化帖子数据、媒体、关系信息，并写入 PostgreSQL。
- 列表与详情页：支持 Dashboard、Bindings、Archives、Runs 四类核心页面。
- 部署能力：支持本地 Docker Compose 一键启动，也支持 Web 部署到 Vercel、数据库部署到 Neon。

### 典型业务链路

```mermaid
flowchart LR
  A["用户登录平台"] --> B["绑定 X 账号"]
  B --> C["保存账号信息与加密 Cookie"]
  C --> D["定时任务 / 手动触发抓取"]
  D --> E["Playwright 抓取推荐流"]
  E --> F["标准化帖子数据"]
  F --> G["按账号 + 帖子 ID 去重"]
  G --> H["归档富文本内容"]
  H --> I["列表页、详情页、运行记录展示"]
```

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js 16、TypeScript、Tailwind CSS 4、ShadCN / Base UI |
| 后端 | NestJS 11、Prisma、Playwright |
| 数据库 | PostgreSQL |
| 认证 | NextAuth.js 5 beta + Prisma Adapter |
| 包管理 | pnpm workspace |
| 部署 | Docker Compose / Vercel + Neon |

## 仓库结构

```text
.
├── apps
│   ├── api        # NestJS API、调度器、抓取执行、Prisma
│   └── web        # Next.js Web 前端
├── docs           # 需求、设计、TODO、部署文档
├── packages
│   └── config     # 共享配置
└── docker-compose.yml
```

## 快速开始

### 1. 准备环境变量

复制模板文件：

```bash
cp .env.example .env
```

如果你使用本仓库自带的 Docker PostgreSQL，请把 `.env` 里的 `DATABASE_URL` 改成：

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:55432/auto_x_to_wechat?schema=public
```

至少需要关注这些变量：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 连接串 |
| `NEXTAUTH_SECRET` | NextAuth 会话签名密钥 |
| `NEXTAUTH_URL` | Web 站点地址 |
| `INTERNAL_API_BASE_URL` | Web BFF 调用 NestJS API 的地址 |
| `INTERNAL_API_SHARED_SECRET` | Web 与 API 的内部签名密钥 |
| `CREDENTIAL_ENCRYPTION_KEY` | X 凭证与 Cookie 的加密密钥 |
| `CRAWLER_ADAPTER_NAME` | `mock` 或 `real` |
| `X_BINDING_SESSION_TIMEOUT_SECONDS` | 浏览器绑定会话时长 |
| `REAL_CRAWLER_MAX_POSTS` | 单次真实抓取最多处理的帖子数 |

### 2. 安装依赖

```bash
pnpm install
```

### 3. 初始化数据库

```bash
pnpm db:migrate
```

### 4. 启动开发环境

```bash
pnpm dev
```

默认端口：

- Web: `http://localhost:3000`
- API: `http://localhost:3001`

## 本地 Docker 启动

### 仅启动数据库 + API

```bash
docker compose up --build db api
```

适合：

- 本地联调 API
- 本地调试抓取器
- 给单独运行的 Next.js 开发服务器提供后端与数据库

默认端口：

- PostgreSQL: `55432`
- API: `3001`
- noVNC 远程桌面: `6080`

### 启动完整服务

```bash
docker compose --profile full up --build
```

适合：

- 一次性拉起 Web + API + PostgreSQL
- 模拟接近生产的完整链路
- 在容器内使用 noVNC 打开 X 登录窗口完成绑定

默认访问地址：

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- noVNC: `http://localhost:6080/vnc.html?autoconnect=1&resize=scale&reconnect=1`

## 真实 X 绑定说明

当前版本支持真实 X 登录态绑定，推荐两种方式：

1. 本地开发模式下优先使用本机 Chrome。
2. Docker 模式下使用容器内置 Chrome + noVNC 远程桌面。

绑定流程：

1. 登录平台后进入 `Bindings` 页面。
2. 点击“打开 X 登录窗口并开始绑定”。
3. 在浏览器或 noVNC 页面中手动完成 X 登录。
4. 返回平台页面，系统会自动轮询会话结果并写入账号信息与 Cookie。

说明：

- `CRAWLER_ADAPTER_NAME=real` 时，后端会使用 Playwright 进行真实抓取。
- 如果只是前后端联调，也可以先使用 `CRAWLER_ADAPTER_NAME=mock`。

## 部署方式

### 方案一：Docker Compose

适合单机部署、内网环境或自托管环境。

建议流程：

1. 准备生产环境变量。
2. 先执行数据库迁移。
3. 启动 PostgreSQL、API 和 Web 容器。
4. 通过 `/health`、登录页、绑定页、归档页做一次回归验证。

常用命令：

```bash
pnpm db:migrate:status
pnpm db:migrate:deploy
docker compose --profile full up --build -d
```

### 方案二：Vercel + Neon + Docker API

推荐拓扑：

- Web：部署到 Vercel
- PostgreSQL：托管在 Neon
- API / Worker：部署到支持 Docker 的服务器

关键点：

- Vercel 项目的 Root Directory 设置为 `apps/web`。
- `DATABASE_URL` 需要同时供 Web 和 API 使用。
- `INTERNAL_API_BASE_URL` 指向已部署的 NestJS API。
- 如果使用真实浏览器辅助绑定，需要让 API 所在环境具备 Playwright / Chrome 运行能力。

详细说明见 [docs/部署上线说明.md](docs/部署上线说明.md)。

## 常用命令

```bash
pnpm dev
pnpm build
pnpm lint
pnpm test
pnpm db:migrate
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:studio
```

单独运行：

```bash
pnpm dev:web
pnpm dev:api
pnpm --filter web test
pnpm --filter api test
```

## 测试与校验

推荐在提交前执行：

```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter web test
pnpm --filter api test
pnpm --filter api build
```

如果 API 测试依赖本地 Docker PostgreSQL，可显式指定：

```bash
DATABASE_URL='postgresql://postgres:postgres@localhost:55432/auto_x_to_wechat?schema=public' pnpm --filter api test
```

## 文档索引

- [需求文档](docs/需求文档.md)
- [详细设计文档](docs/详细设计文档.md)
- [开发 TODO 文档](docs/开发TODO文档.md)
- [部署上线说明](docs/部署上线说明.md)
- [上线检查清单](docs/上线检查清单.md)

## Git 约定

- 分支命名建议：`codex/<scope>`
- 提交前缀建议：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`
- 建议一个 TODO / 一个功能点对应一次清晰提交

