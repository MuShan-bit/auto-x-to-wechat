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
import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";

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

function formatDateTime(value: string | null | undefined, locale: Locale, emptyLabel: string) {
  if (!value) {
    return emptyLabel;
  }

  return new Intl.DateTimeFormat(getIntlLocale(locale), {
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
    ACTIVE: "bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]",
    DISABLED: "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-white/80",
    INVALID: "bg-[#b95c00] text-white dark:bg-[#5a2e00] dark:text-[#ffd1a1]",
    PENDING: "bg-[#7f5a26] text-white dark:bg-[#4b3a1e] dark:text-[#f2c58c]",
  } as const;

  return classNameMap[status];
}

function getRunStatusClassName(status: NonNullable<DashboardSummaryResponse["latestRun"]>["status"]) {
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
    <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.22)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.45)]">
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
  const { messages } = await getRequestMessages();

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
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      summary: null,
    };
  }
}

export default async function DashboardPage() {
  const { locale, messages } = await getRequestMessages();
  const { error, summary } = await getDashboardSummary();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.dashboard.eyebrow}
        title={messages.dashboard.title}
        description={messages.dashboard.description}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.dashboard.manageBindings}
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="outline" className="rounded-full px-4">
                {messages.dashboard.signOut}
              </Button>
            </form>
          </div>
        }
      />

      {error ? (
        <ErrorState
          title={messages.dashboard.errorTitle}
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.dashboard.errorAction}
            </Link>
          }
        />
      ) : null}

      {summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={messages.dashboard.stats.bindingStatus}
              value={messages.enums.bindingStatus[summary.binding?.status ?? "UNBOUND"]}
              toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
              icon={<ShieldCheck className="size-5" />}
            />
            <StatCard
              label={messages.dashboard.stats.nextRun}
              value={formatDateTime(summary.nextRunAt, locale, messages.common.notScheduled)}
              toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
              icon={<Clock3 className="size-5" />}
            />
            <StatCard
              label={messages.dashboard.stats.archiveCount}
              value={String(summary.archiveCount)}
              toneClassName="bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]"
              icon={<Archive className="size-5" />}
            />
            <StatCard
              label={messages.dashboard.stats.latestRunStatus}
              value={messages.enums.runStatus[summary.latestRun?.status ?? "NO_RUN"]}
              toneClassName="bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]"
              icon={<Activity className="size-5" />}
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(31,49,40,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">{messages.dashboard.bindingSummary.title}</CardTitle>
                  {summary.binding ? (
                    <Badge className={`rounded-full ${getBindingStatusClassName(summary.binding.status)}`}>
                      {messages.enums.bindingStatus[summary.binding.status]}
                    </Badge>
                  ) : (
                    <Badge className="rounded-full bg-[#f4ebdb] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                      {messages.enums.bindingStatus.UNBOUND}
                    </Badge>
                  )}
                </div>
                <CardDescription className="leading-6">
                  {messages.dashboard.bindingSummary.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {summary.binding ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-3xl bg-[#f5efe4] p-5 dark:bg-[#3d3124]">
                        <p className="text-xs uppercase tracking-[0.24em] text-[#7f5a26] dark:text-[#f2c58c]">
                          {messages.dashboard.bindingSummary.boundAccount}
                        </p>
                        <p className="mt-2 text-xl font-semibold text-foreground">
                          @{summary.binding.username}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {summary.binding.displayName ?? messages.common.noDisplayName}
                        </p>
                      </div>
                      <div className="rounded-3xl bg-[#eef4f0] p-5 dark:bg-[#223228]">
                        <p className="text-xs uppercase tracking-[0.24em] text-[#2d4d3f] dark:text-[#d8e2db]">
                          {messages.dashboard.bindingSummary.crawlConfig}
                        </p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {messages.bindings.autoCrawlTitle}：
                          {summary.binding.crawlEnabled
                            ? messages.dashboard.bindingSummary.crawlEnabled
                            : messages.dashboard.bindingSummary.crawlDisabled}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatMessage(messages.dashboard.bindingSummary.interval, {
                            minutes: summary.binding.crawlIntervalMinutes,
                          })}
                        </p>
                      </div>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.dashboard.bindingSummary.lastCrawl}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(
                            summary.binding.lastCrawledAt,
                            locale,
                            messages.common.notScheduled,
                          )}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.dashboard.bindingSummary.nextRun}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.nextRunAt, locale, messages.common.notScheduled)}
                        </dd>
                      </div>
                    </dl>

                    {summary.binding.lastErrorMessage ? (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-medium">{messages.dashboard.bindingSummary.latestError}</p>
                        <p className="mt-2 leading-6">{summary.binding.lastErrorMessage}</p>
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
                        <p className="font-medium">{messages.dashboard.bindingSummary.healthyTitle}</p>
                        <p className="mt-2 leading-6">
                          {messages.dashboard.bindingSummary.healthyDescription}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title={messages.dashboard.bindingSummary.emptyTitle}
                    description={messages.dashboard.bindingSummary.emptyDescription}
                    action={
                      <Link
                        href="/bindings"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                      >
                        {messages.dashboard.bindingSummary.emptyAction}
                      </Link>
                    }
                  />
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.28)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
              <CardHeader className="gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-11 items-center justify-center rounded-2xl bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                    <RadioTower className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{messages.dashboard.latestRun.title}</CardTitle>
                    <CardDescription className="leading-6">
                      {messages.dashboard.latestRun.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {summary.latestRun ? (
                  <>
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge className={`rounded-full ${getRunStatusClassName(summary.latestRun.status)}`}>
                        {messages.enums.runStatus[summary.latestRun.status]}
                      </Badge>
                      <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                        {messages.enums.triggerType[summary.latestRun.triggerType]}
                      </Badge>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.dashboard.latestRun.startedAt}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.latestRun.startedAt, locale, messages.common.notRecorded)}
                        </dd>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 py-3 dark:border-white/10 dark:bg-white/8">
                        <dt className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {messages.dashboard.latestRun.finishedAt}
                        </dt>
                        <dd className="mt-1 text-sm text-foreground">
                          {formatDateTime(summary.latestRun.finishedAt, locale, messages.common.notRecorded)}
                        </dd>
                      </div>
                    </dl>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-[#f5efe4] px-4 py-4 dark:bg-[#3d3124]">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#7f5a26] dark:text-[#f2c58c]">{messages.dashboard.latestRun.fetched}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.fetchedCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#eef4f0] px-4 py-4 dark:bg-[#223228]">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#2d4d3f] dark:text-[#d8e2db]">{messages.dashboard.latestRun.archived}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.newCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{messages.dashboard.latestRun.skipped}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.skippedCount}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/30">
                        <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-200">{messages.dashboard.latestRun.failed}</p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {summary.latestRun.failedCount}
                        </p>
                      </div>
                    </div>

                    {summary.latestRun.errorMessage ? (
                      <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-950/30 dark:text-amber-100">
                        <p className="font-medium">{messages.dashboard.latestRun.errorSummary}</p>
                        <p className="mt-2 leading-6">{summary.latestRun.errorMessage}</p>
                      </div>
                    ) : null}

                    <Link
                      href="/runs"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                    >
                      {messages.dashboard.latestRun.viewAll}
                    </Link>
                  </>
                ) : (
                  <EmptyState
                    title={messages.dashboard.latestRun.emptyTitle}
                    description={messages.dashboard.latestRun.emptyDescription}
                    action={
                      <Link
                        href="/bindings"
                        className="inline-flex h-9 items-center justify-center rounded-full bg-[#7f5a26] px-4 text-sm font-medium text-white transition-colors hover:bg-[#65471f] dark:bg-[#f2c58c] dark:text-[#2c2114] dark:hover:bg-[#e5b775]"
                      >
                        {messages.dashboard.latestRun.emptyAction}
                      </Link>
                    }
                  />
                )}
              </CardContent>
            </Card>
          </section>

          <Card className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(185,92,0,0.2)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
            <CardHeader className="gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-200">
                  <Activity className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{messages.dashboard.failures.title}</CardTitle>
                  <CardDescription className="leading-6">
                    {messages.dashboard.failures.description}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-red-50 px-4 py-4 dark:bg-red-950/30">
                  <p className="text-xs uppercase tracking-[0.2em] text-red-600 dark:text-red-200">{messages.dashboard.failures.failedRuns}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">
                    {summary.errorSummary.failedRunCount}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#fcfaf5] px-4 py-4 dark:bg-white/8">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{messages.dashboard.failures.failedPosts}</p>
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
                      className="rounded-3xl border border-border/70 bg-[#fcfaf5] px-4 py-4 dark:border-white/10 dark:bg-white/8"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Badge className={`rounded-full ${getRunStatusClassName(item.status)}`}>
                          {messages.enums.runStatus[item.status]}
                        </Badge>
                        <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                          {messages.enums.triggerType[item.triggerType]}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatMessage(messages.dashboard.failures.failedPostsInline, {
                            count: item.failedCount,
                          })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-foreground">
                        {item.errorMessage ?? messages.dashboard.failures.noErrorSummary}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span>
                          {messages.common.createdAt} {formatDateTime(item.createdAt, locale, messages.common.notRecorded)}
                        </span>
                        <span>
                          {messages.common.finishedAt} {formatDateTime(item.finishedAt, locale, messages.common.notRecorded)}
                        </span>
                      </div>
                      <Link
                        href={`/runs/${item.id}`}
                        className="mt-4 inline-flex h-8 items-center justify-center rounded-full border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                      >
                        {messages.dashboard.failures.viewRun}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-950/30 dark:text-emerald-100">
                  <p className="font-medium">{messages.dashboard.failures.emptyTitle}</p>
                  <p className="mt-2 leading-6">
                    {messages.dashboard.failures.emptyDescription}
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
