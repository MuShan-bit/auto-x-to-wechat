import Link from "next/link";
import { ArrowRight, Database, LayoutDashboard, ShieldCheck, WandSparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const setupCards = [
    {
      title: "Web App",
      description: "Next.js、Tailwind CSS、ShadCN UI 已接入，后续页面可以直接在现有骨架上扩展。",
      icon: LayoutDashboard,
    },
    {
      title: "API Service",
      description: "NestJS 已完成环境变量模块和健康检查入口，适合作为业务模块宿主。",
      icon: ShieldCheck,
    },
    {
      title: "Data Layer",
      description: "Prisma 与 PostgreSQL 开发环境已纳入计划，将承载认证与归档模型。",
      icon: Database,
    },
  ];
  const primaryLinkClassName =
    "inline-flex h-8 items-center justify-center gap-1.5 rounded-full bg-[#2d4d3f] px-3 text-sm font-medium text-white transition-colors hover:bg-[#20372d]";
  const secondaryLinkClassName =
    "inline-flex h-8 items-center justify-center rounded-full border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Build Surface"
        title="把 X 推荐流抓取平台真正跑起来"
        description="当前阶段已经从纯文档仓库推进到可开发单仓结构。接下来可以继续补登录、绑定、抓取任务、归档列表与详情页。"
        badge="Foundation"
        actions={
          <>
            <Link href="/dashboard" className={primaryLinkClassName}>
              打开仪表盘占位页
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/bindings" className={secondaryLinkClassName}>
              查看绑定模块
            </Link>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        {setupCards.map(({ title, description, icon: Icon }) => (
          <Card
            key={title}
            className="rounded-[2rem] border-border/70 bg-white/85 shadow-[0_20px_60px_-38px_rgba(87,62,22,0.35)]"
          >
            <CardHeader className="space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#efe6d7] text-[#7f5a26]">
                <Icon className="size-5" />
              </div>
              <div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="mt-2 text-sm leading-6">
                  {description}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="rounded-[2rem] border-border/70 bg-[#1f3128] text-white shadow-[0_24px_80px_-40px_rgba(31,49,40,0.85)]">
          <CardHeader>
            <Badge className="w-fit rounded-full bg-white/12 text-white hover:bg-white/12">
              Progress Lane
            </Badge>
            <CardTitle className="mt-3 text-2xl">推荐开发顺序已经就绪</CardTitle>
            <CardDescription className="mt-3 max-w-2xl text-sm leading-6 text-white/70">
              先完成认证与数据层，再打通抓取适配器、去重归档和列表展示。这样每一轮都能形成可验证的增量成果。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {[
              "M1: 工程与数据库基础",
              "M2: 绑定、抓取、归档闭环",
              "M3: 前端页面与联调上线",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-sm text-white/85">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <EmptyState
          title="业务页面下一步可以直接接入"
          description="`/dashboard`、`/bindings`、`/archives`、`/runs` 这些路由已经在导航里预留好，后续补页面时可以复用统一布局和通用状态组件。"
          action={
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <WandSparkles className="size-4 text-[#7f5a26]" />
              这一层完成后，后续页面开发会顺很多。
            </div>
          }
        />
      </section>
    </div>
  );
}
