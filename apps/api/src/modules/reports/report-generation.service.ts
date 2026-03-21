import { ReportType, type Prisma } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type RichTextDocument,
  type RichTextNode,
} from '../archives/rich-text.converter';
import { renderRichTextToHtml } from '../archives/rich-text.renderer';
import type { AiGatewayRequest } from '../ai-gateway/ai-gateway.types';
import type { ReportPeriodAggregate } from './report-aggregation.service';

type GeneratedReportType = 'WEEKLY' | 'MONTHLY';

type BuildReportGenerationRequestInput = {
  aggregate: ReportPeriodAggregate;
  modelConfigId?: string;
  periodEnd: Date;
  periodStart: Date;
  reportId: string;
  reportType: GeneratedReportType;
};

type ParsedOutputCandidate = Record<string, unknown>;

type AggregatePostSnapshot = ReportPeriodAggregate['posts'][number];

export type ParsedReportGenerationResult = {
  highlights: Array<{
    archivedPostId: string;
    reason: string | null;
    title: string | null;
  }>;
  keyThemes: string[];
  notableInsights: string[];
  overview: string;
  publishingIdeas: string[];
  summary: string;
  title: string;
};

const MAX_PROMPT_POSTS = 40;
const MAX_POST_TEXT_LENGTH = 900;
const MAX_ARRAY_ITEMS = 6;
const MIN_SUMMARY_LENGTH = 16;
const MAX_SUMMARY_LENGTH = 320;
const MIN_OVERVIEW_LENGTH = 40;
const MAX_OVERVIEW_LENGTH = 2400;
const MAX_TITLE_LENGTH = 120;

@Injectable()
export class ReportGenerationService {
  buildAiRequest(input: BuildReportGenerationRequestInput): AiGatewayRequest {
    const prompt = this.buildPrompt(input);

    return {
      taskType: 'REPORT_SUMMARY',
      modelConfigId: input.modelConfigId,
      responseFormat: 'json_object',
      messages: [
        {
          role: 'system',
          content: prompt.systemPrompt,
        },
        {
          role: 'user',
          content: prompt.userPrompt,
        },
      ],
      auditMetadata: {
        targetType: 'REPORT',
        targetId: input.reportId,
        inputSnapshotJson: {
          reportType: input.reportType,
          periodStart: input.periodStart.toISOString(),
          periodEnd: input.periodEnd.toISOString(),
          aggregate: this.buildAggregateSnapshot(input.aggregate),
        },
      },
    };
  }

  buildPendingReportDocument(title: string) {
    return this.buildDocumentFromParagraphs([
      title,
      'AI 正在整理本周期的重点内容与代表帖子，请稍后刷新查看完整报告。',
    ]);
  }

  buildFailedReportDocument(title: string, errorMessage: string) {
    return this.buildDocumentFromParagraphs([
      title,
      '报告生成失败，可稍后重新尝试生成。',
      `失败原因：${errorMessage}`,
    ]);
  }

  buildSuccessReportDocument(input: {
    aggregate: ReportPeriodAggregate;
    parsedResult: ParsedReportGenerationResult;
    periodEnd: Date;
    periodStart: Date;
    reportType: GeneratedReportType;
  }) {
    const title = input.parsedResult.title.trim();
    const document: RichTextDocument = {
      version: 1,
      blocks: [],
    };
    const sourcePosts = new Map(
      input.aggregate.posts.map((post) => [post.archivedPostId, post]),
    );

    document.blocks.push(this.createTextParagraph(title));
    document.blocks.push(
      this.createTextParagraph(
        `${this.getReportTypeLabel(input.reportType)}范围：${this.formatDate(
          input.periodStart,
        )} 至 ${this.formatDate(input.periodEnd)}，共归档 ${input.aggregate.totalPosts} 条帖子。`,
      ),
    );
    document.blocks.push(this.createTextParagraph(input.parsedResult.summary));
    document.blocks.push(this.createTextParagraph(input.parsedResult.overview));

    this.appendSection(
      document,
      '关键主题',
      input.parsedResult.keyThemes.map((item) => `- ${item}`),
    );
    this.appendSection(
      document,
      '重点观察',
      input.parsedResult.notableInsights.map((item) => `- ${item}`),
    );

    if (input.parsedResult.highlights.length > 0) {
      document.blocks.push(this.createTextParagraph('重点帖子引用'));

      input.parsedResult.highlights.forEach((highlight, index) => {
        const post = sourcePosts.get(highlight.archivedPostId);

        if (!post) {
          return;
        }

        document.blocks.push(
          this.createTextParagraph(
            `${index + 1}. @${post.authorUsername} · ${
              post.binding.username
            } · ${this.formatDate(post.sourceCreatedAt)}`,
          ),
        );

        if (highlight.title) {
          document.blocks.push(
            this.createTextParagraph(`切入点：${highlight.title}`),
          );
        }

        document.blocks.push(
          this.createTextParagraph(
            `帖子摘要：${this.trimText(post.rawText, 220)}`,
          ),
        );

        if (highlight.reason) {
          document.blocks.push(
            this.createTextParagraph(`解读：${highlight.reason}`),
          );
        }

        document.blocks.push(
          this.createLinkParagraph('原帖链接：', '查看来源帖子', post.postUrl),
        );
      });
    }

    this.appendSection(
      document,
      '后续选题建议',
      input.parsedResult.publishingIdeas.map((item) => `- ${item}`),
    );

    const renderedHtml = renderRichTextToHtml(document);

    return {
      renderedHtml,
      richTextJson: document satisfies Prisma.InputJsonValue,
      summaryJson: {
        reportType: input.reportType,
        periodStart: input.periodStart.toISOString(),
        periodEnd: input.periodEnd.toISOString(),
        totalPosts: input.aggregate.totalPosts,
        filters: input.aggregate.filters,
        breakdowns: this.buildAggregateSnapshot(input.aggregate),
        summary: input.parsedResult.summary,
        overview: input.parsedResult.overview,
        keyThemes: input.parsedResult.keyThemes,
        notableInsights: input.parsedResult.notableInsights,
        publishingIdeas: input.parsedResult.publishingIdeas,
        highlights: input.parsedResult.highlights
          .map((item) => {
            const post = sourcePosts.get(item.archivedPostId);

            if (!post) {
              return null;
            }

            return {
              archivedPostId: item.archivedPostId,
              title: item.title,
              reason: item.reason,
              authorUsername: post.authorUsername,
              postUrl: post.postUrl,
              sourceCreatedAt: post.sourceCreatedAt.toISOString(),
            };
          })
          .filter((item) => item !== null),
      } satisfies Prisma.InputJsonValue,
    };
  }

  buildPendingSummary(input: {
    aggregate: ReportPeriodAggregate;
    periodEnd: Date;
    periodStart: Date;
    reportType: GeneratedReportType;
  }): Prisma.InputJsonValue {
    return {
      generationStatus: 'PENDING',
      reportType: input.reportType,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      aggregate: this.buildAggregateSnapshot(input.aggregate),
    };
  }

  buildFailedSummary(input: {
    aggregate: ReportPeriodAggregate;
    errorMessage: string;
    periodEnd: Date;
    periodStart: Date;
    reportType: GeneratedReportType;
  }): Prisma.InputJsonValue {
    return {
      generationStatus: 'FAILED',
      errorMessage: input.errorMessage,
      reportType: input.reportType,
      periodStart: input.periodStart.toISOString(),
      periodEnd: input.periodEnd.toISOString(),
      aggregate: this.buildAggregateSnapshot(input.aggregate),
    };
  }

  buildFallbackTitle(
    reportType: GeneratedReportType,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return `${this.formatDate(periodStart)} 至 ${this.formatDate(
      periodEnd,
    )} ${this.getReportTypeLabel(reportType)}`;
  }

  parseModelOutput(
    rawOutput: string,
    options: {
      aggregate: ReportPeriodAggregate;
      fallbackTitle: string;
    },
  ): ParsedReportGenerationResult {
    const parsedCandidate = this.parseJsonCandidate(rawOutput);
    const availablePostIds = new Set(
      options.aggregate.posts.map((post) => post.archivedPostId),
    );
    const title = this.normalizeTitle(parsedCandidate, options.fallbackTitle);
    const summary = this.normalizeSummary(parsedCandidate);
    const overview = this.normalizeOverview(parsedCandidate, summary);
    const keyThemes = this.normalizeStringArray(parsedCandidate, [
      'keyThemes',
      'themes',
    ]);
    const notableInsights = this.normalizeStringArray(parsedCandidate, [
      'notableInsights',
      'insights',
      'observations',
    ]);
    const publishingIdeas = this.normalizeStringArray(parsedCandidate, [
      'publishingIdeas',
      'storyAngles',
      'recommendations',
    ]);
    const highlights =
      this.normalizeHighlights(parsedCandidate, availablePostIds) ||
      options.aggregate.posts.slice(0, 3).map((post) => ({
        archivedPostId: post.archivedPostId,
        title: null,
        reason: null,
      }));

    return {
      title,
      summary,
      overview,
      keyThemes,
      notableInsights,
      publishingIdeas,
      highlights,
    };
  }

  private buildPrompt(input: BuildReportGenerationRequestInput) {
    const responseSchema = {
      title: 'string',
      summary: 'string',
      overview: 'string',
      keyThemes: ['string'],
      notableInsights: ['string'],
      publishingIdeas: ['string'],
      highlights: [
        {
          archivedPostId: 'string',
          title: 'string | null',
          reason: 'string | null',
        },
      ],
    };
    const systemPrompt = [
      'You generate editorial weekly or monthly reports from archived X posts.',
      'Write the report in Simplified Chinese and keep proper nouns in their original casing.',
      'Use only the provided aggregate data and source post snapshots.',
      'Do not invent posts, statistics, quotes, or URLs.',
      'Every highlight must reference an archivedPostId that exists in the source post list.',
      'Return JSON only and follow the response schema exactly.',
    ].join(' ');
    const userPrompt = [
      `请基于以下归档数据生成${this.getReportTypeLabel(
        input.reportType,
      )}。`,
      '',
      '报告周期：',
      `- 开始：${input.periodStart.toISOString()}`,
      `- 结束：${input.periodEnd.toISOString()}`,
      `- 报告类型：${input.reportType}`,
      '',
      '聚合统计：',
      JSON.stringify(this.buildAggregateSnapshot(input.aggregate), null, 2),
      '',
      `用于生成的帖子快照（最多 ${MAX_PROMPT_POSTS} 条）：`,
      JSON.stringify(this.buildPromptPosts(input.aggregate.posts), null, 2),
      '',
      '输出结构：',
      JSON.stringify(responseSchema, null, 2),
      '',
      '输出要求：',
      `1. title 控制在 ${MAX_TITLE_LENGTH} 个字符以内，适合在报告列表中直接展示。`,
      `2. summary 控制在 ${MIN_SUMMARY_LENGTH} 到 ${MAX_SUMMARY_LENGTH} 个字符之间，用于报告卡片摘要。`,
      `3. overview 为正文总览，控制在 ${MIN_OVERVIEW_LENGTH} 到 ${MAX_OVERVIEW_LENGTH} 个字符之间。`,
      `4. keyThemes、notableInsights、publishingIdeas 各返回 0 到 ${MAX_ARRAY_ITEMS} 条，按重要性排序。`,
      '5. highlights 里必须引用 source post 列表中的 archivedPostId；如果不适合引用可返回空数组。',
      '6. 文案需要客观、可追溯，适合作为后续人工编辑的初稿。',
      '7. 不要输出 Markdown 代码块，不要输出额外解释。',
    ].join('\n');

    return {
      systemPrompt,
      userPrompt,
    };
  }

  private buildAggregateSnapshot(aggregate: ReportPeriodAggregate) {
    return {
      totalPosts: aggregate.totalPosts,
      filters: aggregate.filters,
      bindings: aggregate.bindings.map((item) => ({
        bindingId: item.bindingId,
        username: item.username,
        displayName: item.displayName,
        count: item.count,
      })),
      modes: aggregate.modes,
      categories: aggregate.categories,
      tags: aggregate.tags,
      sourcePosts: aggregate.posts.map((post) => ({
        archivedPostId: post.archivedPostId,
        bindingId: post.binding.bindingId,
        authorUsername: post.authorUsername,
        sourceCreatedAt: post.sourceCreatedAt.toISOString(),
      })),
    };
  }

  private buildPromptPosts(posts: AggregatePostSnapshot[]) {
    return posts.slice(0, MAX_PROMPT_POSTS).map((post) => ({
      archivedPostId: post.archivedPostId,
      xPostId: post.xPostId,
      postUrl: post.postUrl,
      authorUsername: post.authorUsername,
      authorDisplayName: post.authorDisplayName,
      binding: post.binding,
      sourceCreatedAt: post.sourceCreatedAt.toISOString(),
      primaryCategory: post.primaryCategory,
      tags: post.tags,
      modes: post.modes,
      rawText: this.trimText(post.rawText, MAX_POST_TEXT_LENGTH),
    }));
  }

  private appendSection(
    document: RichTextDocument,
    title: string,
    items: string[],
  ) {
    if (items.length === 0) {
      return;
    }

    document.blocks.push(this.createTextParagraph(title));
    items.forEach((item) => {
      document.blocks.push(this.createTextParagraph(item));
    });
  }

  private buildDocumentFromParagraphs(paragraphs: string[]) {
    const richTextJson: RichTextDocument = {
      version: 1,
      blocks: paragraphs.map((paragraph) => this.createTextParagraph(paragraph)),
    };

    return {
      richTextJson,
      renderedHtml: renderRichTextToHtml(richTextJson),
    };
  }

  private createTextParagraph(text: string): RichTextDocument['blocks'][number] {
    return {
      type: 'paragraph',
      children: [
        {
          type: 'text',
          text,
        },
      ],
    };
  }

  private createLinkParagraph(
    prefix: string,
    label: string,
    href: string,
  ): RichTextDocument['blocks'][number] {
    const children: RichTextNode[] = [
      {
        type: 'text',
        text: prefix,
      },
      {
        type: 'link',
        text: label,
        href,
      },
    ];

    return {
      type: 'paragraph',
      children,
    };
  }

  private parseJsonCandidate(rawOutput: string): ParsedOutputCandidate {
    const normalized = rawOutput.trim();

    if (!normalized) {
      throw new BadRequestException('AI report output is empty');
    }

    const fenceMatch = normalized.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidateText = fenceMatch?.[1]?.trim() ?? normalized;
    const jsonText = this.extractJsonObject(candidateText);

    try {
      const parsed = JSON.parse(jsonText) as unknown;

      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
        throw new BadRequestException('AI report output must be a JSON object');
      }

      return parsed as ParsedOutputCandidate;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('AI report output is not valid JSON');
    }
  }

  private extractJsonObject(rawText: string) {
    const trimmed = rawText.trim();

    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }

    const firstBraceIndex = trimmed.indexOf('{');
    const lastBraceIndex = trimmed.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1) {
      throw new BadRequestException(
        'AI report output does not contain a JSON object',
      );
    }

    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  private normalizeTitle(payload: ParsedOutputCandidate, fallbackTitle: string) {
    const title =
      this.normalizeOptionalString(payload.title) ??
      this.normalizeOptionalString(payload.reportTitle) ??
      this.normalizeOptionalString(payload.headline) ??
      fallbackTitle;

    return this.trimText(title, MAX_TITLE_LENGTH);
  }

  private normalizeSummary(payload: ParsedOutputCandidate) {
    const summary =
      this.normalizeOptionalString(payload.summary) ??
      this.normalizeOptionalString(payload.executiveSummary) ??
      this.normalizeOptionalString(payload.abstract);

    if (!summary || summary.length < MIN_SUMMARY_LENGTH) {
      throw new BadRequestException(
        'AI report output is missing a usable summary',
      );
    }

    return this.trimText(summary, MAX_SUMMARY_LENGTH);
  }

  private normalizeOverview(payload: ParsedOutputCandidate, fallback: string) {
    const overview =
      this.normalizeOptionalString(payload.overview) ??
      this.normalizeOptionalString(payload.body) ??
      this.normalizeOptionalString(payload.introduction) ??
      fallback;

    if (overview.length < MIN_OVERVIEW_LENGTH) {
      return fallback;
    }

    return this.trimText(overview, MAX_OVERVIEW_LENGTH);
  }

  private normalizeStringArray(
    payload: ParsedOutputCandidate,
    keys: string[],
  ) {
    for (const key of keys) {
      const value = payload[key];

      if (!Array.isArray(value)) {
        continue;
      }

      const normalizedItems = value
        .map((item) => this.normalizeOptionalString(item))
        .filter((item): item is string => Boolean(item));
      const uniqueItems = [...new Set(normalizedItems)];

      return uniqueItems.slice(0, MAX_ARRAY_ITEMS);
    }

    return [];
  }

  private normalizeHighlights(
    payload: ParsedOutputCandidate,
    availablePostIds: Set<string>,
  ) {
    const rawValue = Array.isArray(payload.highlights)
      ? payload.highlights
      : Array.isArray(payload.keyPosts)
        ? payload.keyPosts
        : null;

    if (!rawValue) {
      return null;
    }

    const normalizedItems = rawValue
      .map((item) => {
        if (!this.isRecord(item)) {
          return null;
        }

        const archivedPostId =
          this.normalizeOptionalString(item.archivedPostId) ??
          this.normalizeOptionalString(item.postId) ??
          this.normalizeOptionalString(item.sourceId) ??
          this.normalizeOptionalString(item.id);

        if (!archivedPostId || !availablePostIds.has(archivedPostId)) {
          return null;
        }

        return {
          archivedPostId,
          title:
            this.normalizeOptionalString(item.title) ??
            this.normalizeOptionalString(item.headline) ??
            this.normalizeOptionalString(item.label) ??
            null,
          reason:
            this.normalizeOptionalString(item.reason) ??
            this.normalizeOptionalString(item.whyItMatters) ??
            this.normalizeOptionalString(item.note) ??
            null,
        };
      })
      .filter(
        (
          item,
        ): item is {
          archivedPostId: string;
          reason: string | null;
          title: string | null;
        } => item !== null,
      );

    const uniqueItems = new Map<string, (typeof normalizedItems)[number]>();

    normalizedItems.forEach((item) => {
      if (!uniqueItems.has(item.archivedPostId)) {
        uniqueItems.set(item.archivedPostId, item);
      }
    });

    return [...uniqueItems.values()].slice(0, MAX_ARRAY_ITEMS);
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }

  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  private trimText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private getReportTypeLabel(reportType: GeneratedReportType) {
    return reportType === ReportType.WEEKLY ? '周报' : '月报';
  }

  private formatDate(value: Date) {
    return value.toISOString().slice(0, 10);
  }
}
