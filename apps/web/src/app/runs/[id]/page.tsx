import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, ArrowLeft, DatabaseZap, ExternalLink, FileWarning } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiRequestError, apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";

type RunDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type RunDetailResponse = {
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
  errorDetail: unknown;
  createdAt: string;
  binding: {
    id: string;
    username: string;
    displayName: string | null;
    status: "ACTIVE" | "DISABLED" | "INVALID" | "PENDING";
  };
  crawlJob: null | {
    id: string;
    enabled: boolean;
    intervalMinutes: number;
    nextRunAt: string | null;
  };
  runPosts: Array<{
    id: string;
    xPostId: string;
    actionType: "CREATED" | "SKIPPED" | "FAILED";
    reason: string | null;
    createdAt: string;
    archivedPost: null | {
      id: string;
      authorUsername: string;
      postType: "POST" | "REPOST" | "QUOTE" | "REPLY";
      postUrl: string;
    };
  }>;
};

function formatDateTime(value: string | null | undefined, locale: Locale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getRunStatusClassName(status: RunDetailResponse["status"]) {
  const classNameMap = {
    QUEUED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    RUNNING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    SUCCESS: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    PARTIAL_FAILED: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
    CANCELLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
  } as const;

  return classNameMap[status];
}

function getActionTypeClassName(actionType: RunDetailResponse["runPosts"][number]["actionType"]) {
  const classNameMap = {
    CREATED: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    SKIPPED: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
    FAILED: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200",
  } as const;

  return classNameMap[actionType];
}

function formatErrorDetail(value: unknown) {
  if (!value) {
    return null;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function getRunDetail(id: string) {
  const { messages } = await getRequestMessages();

  try {
    const run = await apiRequest<RunDetailResponse>({
      path: `/runs/${id}`,
      method: "GET",
    });

    return {
      error: null,
      run,
    };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) {
      notFound();
    }

    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      run: null,
    };
  }
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  const { locale, messages } = await getRequestMessages();
  const { id } = await params;
  const { error, run } = await getRunDetail(id);
  const formattedErrorDetail = run ? formatErrorDetail(run.errorDetail) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.runDetail.eyebrow}
        title={
          run
            ? formatMessage(messages.runDetail.title, { id: run.id.slice(0, 8) })
            : messages.runDetail.titleFallback
        }
        description={
          run
            ? messages.runDetail.descriptionReady
            : messages.runDetail.descriptionLoading
        }
        badge={run ? messages.enums.runStatus[run.status] : undefined}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/runs"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              <ArrowLeft className="mr-2 size-4" />
              {messages.common.backToList}
            </Link>
            {run?.binding ? (
              <Link
                href="/bindings"
                className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
              >
                {messages.runDetail.viewBinding}
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <ErrorState
          title={messages.runDetail.errorTitle}
          description={error}
          action={
            <Link
              href="/runs"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.runDetail.errorAction}
            </Link>
          }
        />
      ) : null}

      {run ? (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/95 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.26)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={`rounded-full ${getRunStatusClassName(run.status)}`}>
                    {messages.enums.runStatus[run.status]}
                  </Badge>
                  <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                    {messages.enums.triggerType[run.triggerType]}
                  </Badge>
                  <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                    {messages.runDetail.createdAt} {formatDateTime(run.createdAt, locale, messages.common.notRecorded)}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-3xl">{messages.runDetail.bindingAccount} @{run.binding.username}</CardTitle>
                  <CardDescription className="leading-6">
                    {messages.runDetail.startedAt}：{formatDateTime(run.startedAt, locale, messages.common.notRecorded)} · {messages.runDetail.finishedAt}：{formatDateTime(run.finishedAt, locale, messages.common.notRecorded)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-[#f5efe4] px-4 py-4 dark:bg-[#3d3124]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">{messages.runDetail.fetched}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.fetchedCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#eef4f0] px-4 py-4 dark:bg-[#223228]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">{messages.runDetail.archived}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.newCount}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{messages.runDetail.skipped}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.skippedCount}</p>
                  </div>
                  <div className="rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/30">
                    <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-200">{messages.runDetail.failed}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{run.failedCount}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                      <DatabaseZap className="size-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {messages.runDetail.runItemsTitle}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {messages.runDetail.runItemsDescription}
                      </p>
                    </div>
                  </div>

                  {run.runPosts.length > 0 ? (
                    <div className="space-y-3">
                      {run.runPosts.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-3xl border border-border/70 bg-[#fcfaf5] p-5 dark:border-white/10 dark:bg-white/8"
                        >
                          <div className="flex flex-wrap items-center gap-3">
                            <Badge className={`rounded-full ${getActionTypeClassName(item.actionType)}`}>
                              {messages.enums.actionType[item.actionType]}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {messages.common.xPostId}：{item.xPostId}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {messages.runDetail.recordTime}：{formatDateTime(item.createdAt, locale, messages.common.notRecorded)}
                            </span>
                          </div>

                          {item.reason ? (
                            <p className="mt-3 text-sm leading-6 text-foreground">{item.reason}</p>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-3">
                            {item.archivedPost ? (
                              <>
                                <Link
                                  href={`/archives/${item.archivedPost.id}`}
                                  className="inline-flex h-8 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:bg-white/10 dark:hover:bg-white/14"
                                >
                                  {messages.runDetail.viewArchive}
                                </Link>
                                <Link
                                  href={item.archivedPost.postUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/14"
                                >
                                  <ExternalLink className="mr-2 size-3.5" />
                                  {messages.common.openOriginal}
                                </Link>
                              </>
                            ) : (
                              <span className="inline-flex h-8 items-center justify-center rounded-full bg-muted/60 px-3 text-xs text-muted-foreground">
                                {messages.runDetail.noArchiveEntity}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title={messages.runDetail.emptyTitle}
                      description={messages.runDetail.emptyDescription}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.24)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <CardTitle className="text-2xl">{messages.runDetail.contextTitle}</CardTitle>
                <CardDescription className="leading-6">
                  {messages.runDetail.contextDescription}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26]">{messages.runDetail.binding}</p>
                  <p className="mt-2 text-sm font-medium text-foreground">@{run.binding.username}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {run.binding.displayName ?? messages.common.noDisplayName} · {messages.enums.bindingStatus[run.binding.status]}
                  </p>
                </div>

                {run.crawlJob ? (
                  <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">{messages.runDetail.crawlJob}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {run.crawlJob.enabled
                        ? messages.runDetail.crawlJobEnabled
                        : messages.runDetail.crawlJobDisabled}{" "}
                      · {formatMessage(messages.bindings.crawlInterval, {
                        minutes: run.crawlJob.intervalMinutes,
                      })}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {messages.runDetail.nextRun}：{formatDateTime(run.crawlJob.nextRunAt, locale, messages.common.notScheduled)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.2)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-[#b95c00] dark:bg-amber-950/30 dark:text-amber-100">
                    <AlertTriangle className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{messages.runDetail.errorInfoTitle}</CardTitle>
                    <CardDescription className="leading-6">
                      {messages.runDetail.errorInfoDescription}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {run.errorMessage ? (
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                    <p className="font-medium">{messages.runDetail.errorSummary}</p>
                    <p className="mt-2 leading-6">{run.errorMessage}</p>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <div className="flex items-center gap-2 font-medium">
                      <Activity className="size-4" />
                      {messages.runDetail.noErrorSummary}
                    </div>
                  </div>
                )}

                {formattedErrorDetail ? (
                  <div className="rounded-3xl border border-border/70 bg-[#1f3128] p-5 text-sm text-white dark:border-white/10 dark:bg-[#142018]">
                    <div className="flex items-center gap-2 font-medium text-white/80">
                      <FileWarning className="size-4" />
                      {messages.common.errorDetail}
                    </div>
                    <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-white/90">
                      {formattedErrorDetail}
                    </pre>
                  </div>
                ) : (
                  <div className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-5 py-4 text-sm text-muted-foreground dark:border-white/10 dark:bg-white/8">
                    {messages.runDetail.noErrorDetail}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}
    </div>
  );
}
