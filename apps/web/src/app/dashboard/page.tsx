import Link from "next/link";
import { Activity, Archive, Clock3, RadioTower, ShieldCheck } from "lucide-react";
import { logoutAction } from "./actions";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

type DashboardSummaryResponse = {
  archiveCount: number;
  binding: {
    id: string;
    username: string;
    displayName: string | null;
    status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
    crawlEnabled: boolean;
    crawlIntervalMinutes: number;
    lastCrawledAt: string | null;
    lastErrorMessage: string | null;
  } | null;
  latestRun: {
    id: string;
    status: "QUEUED" | "RUNNING" | "SUCCESS" | "PARTIAL_FAILED" | "FAILED" | "CANCELLED";
    triggerType: "MANUAL" | "SCHEDULED" | "RETRY";
    fetchedCount: number;
    newCount: number;
    skippedCount: number;
    failedCount: number;
    startedAt: string | null;
    finishedAt: string | null;
    errorMessage: string | null;
  } | null;
  nextRunAt: string | null;
  errorSummary: {
    failedRunCount: number;
    failedPostCount: number;
    recentFailures: Array<{
      id: string;
      status: "FAILED" | "PARTIAL_FAILED";
      triggerType: "MANUAL" | "SCHEDULED" | "RETRY";
      errorMessage: string | null;
      failedCount: number;
      createdAt: string;
      finishedAt: string | null;
    }>;
  };
};

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未安排";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getBindingStatusClassName(status: DashboardSummaryResponse["binding"] extends infer T
  ? T extends { status: infer S }
    ? S
    : never
  : never) {
  const classNameMap = {
    ACTIVE: "bg-[#2d4d3f] text-white",
    DISABLED: "bg-slate-200 text-slate-700",
    INVALID: "bg-[#b95c00] text-white",
    PENDING: "bg-[#7f5a26] text-white",
  } as const;

  return classNameMap[status];
}

function getRunStatusClassName(status: NonNullable<DashboardSummaryResponse["latestRun"]>["status"]) {
  const classNameMap = {
    QUEUED: "bg-slate-200 text-slate-700",
    RUNNING: "bg-[#7f5a26] text-white",
    SUCCESS: "bg-[#2d4d3f] text-white",
    PARTIAL_FAILED: "bg-[#b95c00] text-white",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-slate-200 text-slate-700",
  } as const;

  return classNameMap[status];
}

function StatCard({
  icon,
  label,
  value,
  toneClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  toneClassName: string;
}) {
  return (
    <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.22)]">
      <CardContent className="flex items-start justify-between gap-4 p-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        </div>
        <div
          className={`flex size-11 items-center justify-center rounded-2xl ${toneClassName}`}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

async function getDashboardSummary() {
  try {
    const summary = await apiRequest<DashboardSummaryResponse>({
      path: "/dashboard/summary",
      method: "GET",
    });

    return {
      error: null,
      summary,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, "仪表盘数据加载失败，请稍后刷新重试。"),
      summary: null,
    };
  }
}

export default async function DashboardPage() {
  const { error, summary } = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Dashboard"
        description="这里集中展示当前绑定状态、下一次抓取安排、最近一次执行结果和累计归档规模。"
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              管理绑定
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="rounded-full px-4">
                退出登录
              </Button>
            </form>
          </div>
        }
      />

      {error ? (
        <ErrorState
          title="仪表盘暂时不可用"
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              先去查看绑定
            </Link>
          }
        />
      ) : null}

      {summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="绑定状态"
              value={summary.binding?.status ?? "UNBOUND"}
              toneClassName="bg-[#eef4f0] text-[#2d4d3f]"
              icon={<ShieldCheck className="size-5" />}
            />
            <StatCard
              label="下一次抓取"
              value={formatDateTime(summary.nextRunAt)}
              toneClassName="bg-[#f5efe4] text-[#7f5a26]"
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              label="累计归档"
              value={String(summary.archiveCount)}
              toneClassName="bg-[#eef4f0] text-[#2d4d3f]"
              icon={<Archive className="size-5" />}
            />
            <StatCard
              label="最近执行状态"
              value={summary.latestRun?.status ?? "NO_RUN"}
              toneClassName="bg-[#f5efe4] text-[#7f5a26]"
              icon={<Activity className="size-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)]">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">当前绑定摘要</CardTitle>
                  {summary.binding ? (
                    <Badge className={`rounded-full ${getBindingStatusClassName(summary.binding.status)}`}>
                      {summary.binding.status}
                    </Badge>
                  ) : (
                    <Badge className="rounded-full bg-[#f4ebdb] text-[#7f5a26]">UNBOUND</Badge>
                  )}
                </div>
                <CardDescription className="leading-6">
                  绑定页负责配置账号与凭证，这里专注展示运行态摘要，方便快速判断系统是否健康。
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {summary.binding ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-[#f5efe4] p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26]">
                          Bound Account
                        </p>
                        <p className="mt-2 text-xl font-semibold text-foreground">
                          @{summary.binding.username}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {summary.binding.displayName ?? "未填写显示名"}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-[#eef4f0] p-5">
                        <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f]">
                          Crawl Config
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          自动抓取：{summary.binding.crawlEnabled ? "已开启" : "已关闭"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          每 {summary.binding.crawlIntervalMinutes} 分钟执行一次
                        </p>
                      </div>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          最近抓取
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.binding.lastCrawledAt)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          下一次执行
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.nextRunAt)}
                        </dd>
                      </div>
                    </dl>

                    {summary.binding.lastErrorMessage ? (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                        <p className="font-medium">最近错误摘要</p>
                        <p className="mt-2 leading-6">{summary.binding.lastErrorMessage}</p>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                        <p className="font-medium">运行状态正常</p>
                        <p className="mt-2 leading-6">
                          当前绑定没有记录到最近错误，可以继续观察后续自动抓取结果。
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title="还没有绑定 X 账号"
                    description="先完成账号绑定和抓取配置，仪表盘才会开始展示抓取时间、执行结果和归档统计。"
                    action={
                      <Link
                        href="/bindings"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
                      >
                        前往绑定
                      </Link>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.28)]">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#7f5a26]">
                    <RadioTower className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">最近一次抓取</CardTitle>
                    <CardDescription className="leading-6">
                      这里展示最近一条执行记录的触发方式、统计结果和错误摘要。
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {summary.latestRun ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={`rounded-full ${getRunStatusClassName(summary.latestRun.status)}`}>
                        {summary.latestRun.status}
                      </Badge>
                      <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f]">
                        {summary.latestRun.triggerType}
                      </Badge>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          开始时间
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.latestRun.startedAt)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          结束时间
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.latestRun.finishedAt)}
                        </dd>
                      </div>
                    </dl>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f5efe4] px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">抓取总数</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.fetchedCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#eef4f0] px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">新增归档</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.newCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">跳过数量</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.skippedCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-red-50 px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-red-600">失败数量</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.failedCount}
                        </p>
                      </div>
                    </div>

                    {summary.latestRun.errorMessage ? (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                        <p className="font-medium">错误摘要</p>
                        <p className="mt-2 leading-6">{summary.latestRun.errorMessage}</p>
                      </div>
                    ) : null}

                    <Link
                      href="/runs"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      查看全部执行记录
                    </Link>
                  </>
                ) : (
                  <EmptyState
                    title="还没有抓取记录"
                    description="你可以先到绑定页手动触发一次抓取，随后这里会显示最新的执行统计和错误摘要。"
                    action={
                      <Link
                        href="/bindings"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#7f5a26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#65471f]"
                      >
                        立即去抓取
                      </Link>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.2)]">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                  <Activity className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">错误告警摘要</CardTitle>
                  <CardDescription className="leading-6">
                    汇总当前绑定下的失败执行次数、失败帖子数量，并聚合最近的失败记录。
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-red-50 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-600">失败执行次数</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {summary.errorSummary.failedRunCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    失败帖子数量
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {summary.errorSummary.failedPostCount}
                  </p>
                </div>
              </div>

              {summary.errorSummary.recentFailures.length > 0 ? (
                <div className="space-y-3">
                  {summary.errorSummary.recentFailures.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={`rounded-full ${getRunStatusClassName(item.status)}`}>
                          {item.status}
                        </Badge>
                        <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                          {item.triggerType}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          失败帖子 {item.failedCount}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {item.errorMessage ?? "没有记录错误摘要。"}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>创建于 {formatDateTime(item.createdAt)}</span>
                        <span>结束于 {formatDateTime(item.finishedAt)}</span>
                      </div>
                      <Link
                        href={`/runs/${item.id}`}
                        className="mt-4 inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        查看失败详情
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                  <p className="font-medium">最近没有失败告警</p>
                  <p className="mt-2 leading-6">
                    当前绑定下的抓取运行没有失败记录，告警聚合会在出现失败后自动累积。
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
