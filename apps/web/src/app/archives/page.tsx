import Link from "next/link";
import { Archive, ImageIcon, Link2, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { PageHeader } from "@/components/page-header";
import { PaginationNav } from "@/components/pagination-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, getApiErrorMessage } from "@/lib/api-client";

type ArchivesPageProps = {
  searchParams?: Promise<{
    page?: string;
    pageSize?: string;
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
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

function getMediaSummary(mediaItems: ArchiveListItem["mediaItems"]) {
  if (mediaItems.length === 0) {
    return "无媒体";
  }

  const groupedCount = mediaItems.reduce<Record<string, number>>((result, item) => {
    result[item.mediaType] = (result[item.mediaType] ?? 0) + 1;

    return result;
  }, {});

  return Object.entries(groupedCount)
    .map(([type, count]) => `${type} x${count}`)
    .join(" / ");
}

async function getArchivesList(page: number, pageSize: number) {
  try {
    const payload = await apiRequest<ArchivesListResponse>({
      path: `/archives?page=${page}&pageSize=${pageSize}`,
      method: "GET",
    });

    return {
      error: null,
      payload,
    };
  } catch (error) {
    return {
      error: getApiErrorMessage(error, "归档列表加载失败，请稍后重试。"),
      payload: null,
    };
  }
}

export default async function ArchivesPage({ searchParams }: ArchivesPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const page = parsePositiveInt(resolvedSearchParams.page, 1);
  const pageSize = parsePositiveInt(resolvedSearchParams.pageSize, 6);
  const { error, payload } = await getArchivesList(page, pageSize);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Archive"
        title="Archives"
        description="这里按卡片展示已经归档的推荐帖子，支持分页浏览、查看原文来源和进入详情页。"
        badge={payload ? `${payload.total} Posts` : undefined}
      />

      {error ? (
        <ErrorState
          title="归档列表加载失败"
          description={error}
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              先去检查绑定
            </Link>
          }
        />
      ) : null}

      {payload && payload.items.length === 0 ? (
        <EmptyState
          title="还没有归档内容"
          description="先在绑定页完成账号配置并手动抓取一次，系统就会把推荐帖子存档到这里。"
          action={
            <Link
              href="/bindings"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
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
                className="rounded-[2rem] border-border/70 bg-white/92 shadow-[0_24px_80px_-40px_rgba(87,62,22,0.25)]"
              >
                <CardHeader className="gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="rounded-full bg-[#2d4d3f] text-white">
                      {item.postType}
                    </Badge>
                    <Badge className="rounded-full bg-[#f5efe4] text-[#7f5a26]">
                      归档于 {formatDateTime(item.archivedAt)}
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
                      来源绑定账号：@{item.binding.username} · 原帖发布时间：{formatDateTime(item.sourceCreatedAt)}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-3xl bg-[#fcfaf5] p-5">
                    <p className="text-sm leading-7 text-foreground">
                      {truncateText(item.rawText, 220)}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-[#eef4f0] px-4 py-4">
                      <div className="flex items-center gap-2 text-[#2d4d3f]">
                        <ImageIcon className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          Media
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-foreground">
                        {getMediaSummary(item.mediaItems)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-[#f5efe4] px-4 py-4">
                      <div className="flex items-center gap-2 text-[#7f5a26]">
                        <Archive className="size-4" />
                        <p className="text-xs font-semibold uppercase tracking-[0.2em]">
                          Archive Id
                        </p>
                      </div>
                      <p className="mt-2 truncate font-mono text-sm text-foreground">{item.id}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/archives/${item.id}`}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#2d4d3f] px-4 text-sm font-medium text-white transition-colors hover:bg-[#20372d]"
                    >
                      查看详情
                    </Link>
                    <Link
                      href={item.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      <Link2 className="mr-2 size-4" />
                      打开原帖
                    </Link>
                    <span className="inline-flex h-9 items-center justify-center rounded-full bg-muted/60 px-4 text-sm text-muted-foreground">
                      <MessageSquareText className="mr-2 size-4" />
                      {item.mediaItems.length > 0 ? "包含媒体内容" : "文本帖文"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <PaginationNav
            basePath="/archives"
            page={payload.page}
            pageSize={payload.pageSize}
            total={payload.total}
          />
        </>
      ) : null}
    </div>
  );
}
