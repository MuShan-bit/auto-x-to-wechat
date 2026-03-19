import Link from "next/link";
import { Activity, ExternalLink, Orbit, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

type RunsPageProps = {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
  }>;
};

type RunListItem = {
  id: string;
  triggerType: "MANUAL" | "SCHEDULED" | "RETRY";
  status: "QUEUED" | "RUNNING" | "SUCCESS" | "PARTIAL_FAILED" | "FAILED" | "CANCELLED";
  startedAt: string | null;
  finishedAt: string | null;
  fetchedCount: number;
  newCount: number;
  skippedCount: number;
  failedCount: number;
  errorMessage: string | null;
  createdAt: string;
  binding: {
    id: string;
    username: string;
    status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  };
};

type RunsListResponse = {
  items: RunListItem[];
  page: number;
  pageSize: number;
  total: number;
};

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "未记录";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRunStatusClassName(status: RunListItem["status"]) {
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

async function getRunsList(page: number, pageSize: number) {
  try {
    const payload = await apiRequest<RunsListResponse>({
      path: `/runs?page=${page}&pageSize=${pageSize}`,
      method: "GET",
    });

    return {
      error: null,
      payload,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, "抓取记录加载失败，请稍后重试。"),
      payload: null,
    };
  }
}

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const pageSize = parsePositiveInt(resolvedSearchParams.pageSize, 8);
  const { error, payload } = await getRunsList(page, pageSize);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Task History"
        title="Runs"
        description="这里按时间倒序展示抓取执行记录，方便回看触发方式、统计结果、失败原因和详情入口。"
        badge={payload ? `${payload.total} Runs` : undefined}
      />

      {error ? (
        <ErrorState
          title="抓取记录加载失败"
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              返回绑定页
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length === 0 ? (
        <EmptyState
          title="还没有执行记录"
          description="先在绑定页完成账号配置并发起一次抓取，系统就会开始在这里沉淀执行历史。"
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#7f5a26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#65471f]"
            >
              去触发抓取
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length > 0 ? (
        <>
          <section className="grid gap-6 lg:grid-cols-2">
            {payload.items.map((item) => (
              <Card
                key={item.id}
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.25)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className={`rounded-full ${getRunStatusClassName(item.status)}`}>
                      {item.status}
                    </Badge>
                    <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f]">
                      {item.triggerType}
                    </Badge>
                    <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                      创建于 {formatDateTime(item.createdAt)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">绑定账号 @{item.binding.username}</CardTitle>
                    <CardDescription className="leading-6">
                      开始：{formatDateTime(item.startedAt)} · 结束：{formatDateTime(item.finishedAt)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div className="rounded-2xl bg-[#f5efe4] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">抓取总数</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.fetchedCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#eef4f0] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f]">新增</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.newCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">跳过</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.skippedCount}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-red-50 px-4 py-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-red-600">失败</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">
                        {item.failedCount}
                      </p>
                    </div>
                  </div>

                  {item.errorMessage ? (
                    <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                      <div className="flex items-center gap-2 font-medium">
                        <ShieldAlert className="size-4" />
                        错误摘要
                      </div>
                      <p className="mt-2 leading-6">{item.errorMessage}</p>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                      <div className="flex items-center gap-2 font-medium">
                        <Activity className="size-4" />
                        当前记录没有错误摘要
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/runs/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
                    >
                      查看详情
                    </Link>
                    <Link
                      href="/bindings"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Orbit className="mr-2 size-4" />
                      返回绑定页
                    </Link>
                    <span className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 px-4 text-sm text-muted-foreground">
                      <ExternalLink className="mr-2 size-4" />
                      Run Id: {item.id.slice(0, 8)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <PaginationNav
            basePath="/runs"
            page={payload.page}
            pageSize={payload.pageSize}
            total={payload.total}
          />
        </>
      ) : null}
    </div>
  );
}
