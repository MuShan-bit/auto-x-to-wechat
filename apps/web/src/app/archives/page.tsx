import Link from "next/link";
import { Archive, ImageIcon, Link2, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";
import { formatMessage, getIntlLocale, type Locale } from "@/lib/i18n";
import { getRequestMessages } from "@/lib/request-locale";

const archivePostTypes = ["POST", "REPOST", "QUOTE", "REPLY"] as const;

type ArchivesPageProps = {
  searchParams?: Promise<{
    dateFrom?: string;
    dateTo?: string;
    keyword?: string;
    page?: string;
    pageSize?: string;
    postType?: string;
  }>;
};

type ArchiveListItem = {
  id: string;
  postType: "POST" | "REPOST" | "QUOTE" | "REPLY";
  postUrl: string;
  authorUsername: string;
  authorDisplayName: string | null;
  rawText: string;
  sourceCreatedAt: string;
  archivedAt: string;
  mediaItems: Array<{
    id: string;
    mediaType: "IMAGE" | "VIDEO" | "GIF";
    sourceUrl: string;
  }>;
  binding: {
    id: string;
    username: string;
  };
};

type ArchivesListResponse = {
  items: ArchiveListItem[];
  page: number;
  pageSize: number;
  total: number;
};

type ArchiveFilters = {
  dateFrom?: string;
  dateTo?: string;
  keyword?: string;
  page?: string;
  pageSize?: string;
  postType?: (typeof archivePostTypes)[number];
};

function formatDateTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

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

function getSingleQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function normalizePostType(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  return archivePostTypes.includes(value as (typeof archivePostTypes)[number])
    ? (value as (typeof archivePostTypes)[number])
    : undefined;
}

function buildArchivesQueryString(filters: ArchiveFilters) {
  const searchParams = new URLSearchParams();

  const entries = Object.entries(filters);

  for (const [key, value] of entries) {
    if (!value) {
      continue;
    }

    searchParams.set(key, value);
  }

  return searchParams.toString();
}

function getMediaSummary(
  mediaItems: ArchiveListItem["mediaItems"],
  messages: Awaited<ReturnType<typeof getRequestMessages>>["messages"],
) {
  if (mediaItems.length === 0) {
    return messages.common.noMedia;
  }

  const groupedCount = mediaItems.reduce<Record<string, number>>((result, item) => {
    result[item.mediaType] = (result[item.mediaType] ?? 0) + 1;

    return result;
  }, {});

  return Object.entries(groupedCount)
    .map(([type, count]) => `${type} x${count}`)
    .join(" / ");
}

async function getArchivesList(page: number, pageSize: number, filters: ArchiveFilters) {
  const { messages } = await getRequestMessages();

  try {
    const queryString = buildArchivesQueryString({
      page: String(page),
      pageSize: String(pageSize),
      keyword: filters.keyword,
      postType: filters.postType,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    const payload = await apiRequest<ArchivesListResponse>({
      path: `/archives?${queryString}`,
      method: "GET",
    });

    return {
      error: null,
      payload,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      payload: null,
    };
  }
}

export default async function ArchivesPage({ searchParams }: ArchivesPageProps) {
  const { locale, messages } = await getRequestMessages();
  const resolvedSearchParams = (await searchParams) ?? {};
  const keyword = getSingleQueryValue(resolvedSearchParams.keyword)?.trim() || undefined;
  const postType = normalizePostType(getSingleQueryValue(resolvedSearchParams.postType));
  const dateFrom = getSingleQueryValue(resolvedSearchParams.dateFrom) || undefined;
  const dateTo = getSingleQueryValue(resolvedSearchParams.dateTo) || undefined;
  const page = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.page), 1);
  const pageSize = parsePositiveInt(getSingleQueryValue(resolvedSearchParams.pageSize), 6);
  const activeFilters = {
    keyword,
    postType,
    dateFrom,
    dateTo,
  } satisfies ArchiveFilters;
  const hasActiveFilters = Boolean(keyword || postType || dateFrom || dateTo);
  const resetHref = buildArchivesQueryString({ pageSize: String(pageSize) });
  const { error, payload } = await getArchivesList(page, pageSize, activeFilters);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={messages.archives.eyebrow}
        title={messages.archives.title}
        description={messages.archives.description}
        badge={payload ? `${payload.total} ${messages.common.postCountLabel}` : undefined}
      />

      <Card className="rounded-[2rem] border-border/70 bg-white/90 shadow-[0_24px_80px_-40px_rgba(45,77,63,0.22)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]">
        <CardHeader className="gap-3">
          <CardTitle className="text-xl">{messages.archives.filterTitle}</CardTitle>
          <CardDescription>
            {messages.archives.filterDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr_auto]" method="GET">
            <input type="hidden" name="pageSize" value={String(pageSize)} />
            <Input
              name="keyword"
              defaultValue={keyword}
              placeholder={messages.archives.keywordPlaceholder}
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
            />
            <select
              name="postType"
              defaultValue={postType ?? ""}
              className="h-11 rounded-2xl border border-border/70 bg-[#fcfaf5] px-4 text-sm text-foreground outline-none transition-colors focus:border-[#2d4d3f] dark:border-white/10 dark:bg-white/8 dark:focus:border-[#d8e2db]"
            >
              <option value="">{messages.archives.allTypes}</option>
              {archivePostTypes.map((item) => (
                <option key={item} value={item}>
                  {messages.enums.postType[item]}
                </option>
              ))}
            </select>
            <Input
              name="dateFrom"
              type="date"
              defaultValue={dateFrom}
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
            />
            <Input
              name="dateTo"
              type="date"
              defaultValue={dateTo}
              className="h-11 rounded-2xl border-border/70 bg-[#fcfaf5] px-4 dark:border-white/10 dark:bg-white/8"
            />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="rounded-full bg-[#2d4d3f] px-5 hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]">
                {messages.archives.applyFilters}
              </Button>
              <Link
                href={resetHref ? `/archives?${resetHref}` : "/archives"}
                className="inline-flex h-8 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
              >
                {messages.archives.clearFilters}
              </Link>
            </div>
          </form>
          {hasActiveFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {keyword ? (
                <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                  {formatMessage(messages.archives.keywordBadge, { keyword })}
                </Badge>
              ) : null}
              {postType ? (
                <Badge className="rounded-full bg-[#eef4f0] text-[#2d4d3f] dark:bg-[#223228] dark:text-[#d8e2db]">
                  {formatMessage(messages.archives.typeBadge, {
                    postType: messages.enums.postType[postType],
                  })}
                </Badge>
              ) : null}
              {dateFrom || dateTo ? (
                <Badge className="rounded-full bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80">
                  {formatMessage(messages.archives.dateBadge, {
                    dateFrom: dateFrom ?? messages.common.startDate,
                    dateTo: dateTo ?? messages.common.untilNow,
                  })}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <ErrorState
          title={messages.archives.errorTitle}
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
            >
              {messages.archives.errorAction}
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? messages.archives.emptyFilteredTitle : messages.archives.emptyTitle}
          description={
            hasActiveFilters
              ? messages.archives.emptyFilteredDescription
              : messages.archives.emptyDescription
          }
          action={
            <Link
              href={hasActiveFilters ? (resetHref ? `/archives?${resetHref}` : "/archives") : "/bindings"}
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
            >
              {hasActiveFilters ? messages.archives.emptyFilteredAction : messages.archives.emptyAction}
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
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.25)] dark:border-white/10 dark:bg-white/6 dark:shadow-[0_24px_80px_-40px_rgba(0,0,0,0.5)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-full bg-[#2d4d3f] text-white dark:bg-[#d8e2db] dark:text-[#18201b]">
                      {messages.enums.postType[item.postType]}
                    </Badge>
                    <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26] dark:bg-[#3d3124] dark:text-[#f2c58c]">
                      {messages.common.archiveAt} {formatDateTime(item.archivedAt, locale)}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-2xl">
                      @{item.authorUsername}
                      {item.authorDisplayName ? (
                        <span className="ml-2 text-lg font-normal text-muted-foreground">
                          {item.authorDisplayName}
                        </span>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="leading-6">
                      {messages.archives.sourceBinding}：@{item.binding.username} · {messages.archives.sourceCreatedAt}：{formatDateTime(item.sourceCreatedAt, locale)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-3xl bg-[#fcfaf5] p-5 dark:bg-white/8">
                    <p className="text-sm leading-7 text-foreground">
                      {truncateText(item.rawText, 220)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-[#eef4f0] px-4 py-4 dark:border-white/10 dark:bg-[#223228]">
                      <div className="flex items-center gap-2 text-[#2d4d3f] dark:text-[#d8e2db]">
                        <ImageIcon className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          {messages.archives.media}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {getMediaSummary(item.mediaItems, messages)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#f5efe4] px-4 py-4 dark:border-white/10 dark:bg-[#3d3124]">
                      <div className="flex items-center gap-2 text-[#7f5a26] dark:text-[#f2c58c]">
                        <Archive className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          {messages.archives.archiveId}
                        </p>
                      </div>
                      <p className="mt-2 truncate font-mono text-sm text-foreground">{item.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/archives/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d] dark:bg-[#d8e2db] dark:text-[#18201b] dark:hover:bg-[#c8d3cb]"
                    >
                      {messages.common.viewDetails}
                    </Link>
                    <Link
                      href={item.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/8 dark:hover:bg-white/12"
                    >
                      <Link2 className="mr-2 size-4" />
                      {messages.common.openOriginal}
                    </Link>
                    <span className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 px-4 text-sm text-muted-foreground dark:bg-white/8 dark:text-white/70">
                      <MessageSquareText className="mr-2 size-4" />
                      {item.mediaItems.length > 0 ? messages.archives.mediaIncluded : messages.archives.textOnly}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <PaginationNav
            basePath="/archives"
            locale={locale}
            page={payload.page}
            pageSize={payload.pageSize}
            query={activeFilters}
            total={payload.total}
          />
        </>
      ) : null}
    </div>
  );
}
