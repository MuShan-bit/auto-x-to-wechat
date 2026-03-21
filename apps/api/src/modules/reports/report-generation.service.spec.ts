import { CrawlMode, ReportType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import {
  ReportGenerationService,
  type ParsedReportGenerationResult,
} from './report-generation.service';
import type { ReportPeriodAggregate } from './report-aggregation.service';

function createAggregate(): ReportPeriodAggregate {
  return {
    totalPosts: 2,
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
    periodEnd: new Date('2026-03-08T00:00:00.000Z'),
    filters: {
      bindingIds: ['binding-001'],
      categoryIds: [],
      tagIds: [],
      modes: [CrawlMode.RECOMMENDED],
    },
    bindings: [
      {
        bindingId: 'binding-001',
        username: 'demo_binding',
        displayName: 'Demo Binding',
        count: 2,
      },
    ],
    modes: [
      {
        mode: CrawlMode.RECOMMENDED,
        count: 2,
      },
    ],
    categories: [
      {
        categoryId: 'category-ai',
        name: 'AI',
        slug: 'ai',
        count: 2,
      },
    ],
    tags: [
      {
        tagId: 'tag-openai',
        name: 'OpenAI',
        slug: 'openai',
        count: 2,
      },
    ],
    posts: [
      {
        archivedPostId: 'archive-001',
        xPostId: 'x-post-001',
        postUrl: 'https://x.com/demo/status/001',
        authorUsername: 'demo_author',
        authorDisplayName: 'Demo Author',
        binding: {
          bindingId: 'binding-001',
          username: 'demo_binding',
          displayName: 'Demo Binding',
        },
        modes: [CrawlMode.RECOMMENDED],
        primaryCategory: {
          categoryId: 'category-ai',
          name: 'AI',
          slug: 'ai',
        },
        rawText:
          'OpenAI 发布了新的 agent 工作流，并分享了推理性能与部署策略的最新进展。',
        sourceCreatedAt: new Date('2026-03-06T10:00:00.000Z'),
        tags: [
          {
            tagId: 'tag-openai',
            name: 'OpenAI',
            slug: 'openai',
          },
        ],
      },
      {
        archivedPostId: 'archive-002',
        xPostId: 'x-post-002',
        postUrl: 'https://x.com/demo/status/002',
        authorUsername: 'infra_author',
        authorDisplayName: 'Infra Author',
        binding: {
          bindingId: 'binding-001',
          username: 'demo_binding',
          displayName: 'Demo Binding',
        },
        modes: [CrawlMode.RECOMMENDED],
        primaryCategory: {
          categoryId: 'category-ai',
          name: 'AI',
          slug: 'ai',
        },
        rawText:
          '另一条帖子讨论了大模型应用落地时的算力成本与工作流编排问题。',
        sourceCreatedAt: new Date('2026-03-05T08:00:00.000Z'),
        tags: [
          {
            tagId: 'tag-openai',
            name: 'OpenAI',
            slug: 'openai',
          },
        ],
      },
    ],
  };
}

describe('ReportGenerationService', () => {
  let service: ReportGenerationService;

  beforeEach(() => {
    service = new ReportGenerationService();
  });

  it('builds a structured AI request for report generation', () => {
    const request = service.buildAiRequest({
      aggregate: createAggregate(),
      modelConfigId: 'model-report-summary',
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-08T00:00:00.000Z'),
      reportId: 'report-001',
      reportType: ReportType.WEEKLY,
    });

    expect(request).toEqual({
      taskType: 'REPORT_SUMMARY',
      modelConfigId: 'model-report-summary',
      responseFormat: 'json_object',
      messages: [
        expect.objectContaining({
          role: 'system',
        }),
        expect.objectContaining({
          role: 'user',
        }),
      ],
      auditMetadata: {
        targetType: 'REPORT',
        targetId: 'report-001',
        inputSnapshotJson: expect.objectContaining({
          reportType: ReportType.WEEKLY,
        }),
      },
    });
    expect(request.messages[0]?.content).toContain('Simplified Chinese');
    expect(request.messages[1]?.content).toContain('"highlights"');
    expect(request.messages[1]?.content).toContain('archive-001');
  });

  it('parses valid model output and filters invalid highlight post ids', () => {
    const result = service.parseModelOutput(
      [
        '```json',
        '{',
        '  "title": "AI 工作流周报",',
        '  "summary": "本周重点集中在 OpenAI agent 工作流、部署效率和成本控制。",',
        '  "overview": "本周期归档内容主要围绕 agent 工作流优化、模型部署成本以及团队协作方式展开，呈现出从能力展示走向生产落地的趋势。",',
        '  "keyThemes": ["Agent 工作流", "推理效率"],',
        '  "notableInsights": ["团队开始关注从 Demo 到生产编排的迁移。"],',
        '  "publishingIdeas": ["整理一篇关于 agent 落地路线图的解读。"],',
        '  "highlights": [',
        '    {"archivedPostId": "archive-001", "title": "Agent 工作流升级", "reason": "代表本周最强的产品信号。"},',
        '    {"archivedPostId": "missing-post", "title": "无效引用", "reason": "应被过滤"}',
        '  ]',
        '}',
        '```',
      ].join('\n'),
      {
        aggregate: createAggregate(),
        fallbackTitle: 'Fallback title',
      },
    );

    expect(result).toEqual<ParsedReportGenerationResult>({
      title: 'AI 工作流周报',
      summary: '本周重点集中在 OpenAI agent 工作流、部署效率和成本控制。',
      overview:
        '本周期归档内容主要围绕 agent 工作流优化、模型部署成本以及团队协作方式展开，呈现出从能力展示走向生产落地的趋势。',
      keyThemes: ['Agent 工作流', '推理效率'],
      notableInsights: ['团队开始关注从 Demo 到生产编排的迁移。'],
      publishingIdeas: ['整理一篇关于 agent 落地路线图的解读。'],
      highlights: [
        {
          archivedPostId: 'archive-001',
          title: 'Agent 工作流升级',
          reason: '代表本周最强的产品信号。',
        },
      ],
    });
  });

  it('builds report rich text and html with source post references', () => {
    const document = service.buildSuccessReportDocument({
      aggregate: createAggregate(),
      periodStart: new Date('2026-03-01T00:00:00.000Z'),
      periodEnd: new Date('2026-03-08T00:00:00.000Z'),
      reportType: ReportType.WEEKLY,
      parsedResult: {
        title: 'AI 工作流周报',
        summary: '本周重点集中在 agent 工作流与部署效率。',
        overview:
          '归档内容显示，团队正在从功能演示转向生产级 agent 编排和推理优化。',
        keyThemes: ['Agent 工作流'],
        notableInsights: ['部署效率成为内容讨论主轴。'],
        publishingIdeas: ['写一篇 agent 编排实践观察。'],
        highlights: [
          {
            archivedPostId: 'archive-001',
            title: '代表帖子',
            reason: '说明了从能力展示到生产落地的趋势。',
          },
        ],
      },
    });

    expect(document.renderedHtml).toContain('AI 工作流周报');
    expect(document.renderedHtml).toContain('查看来源帖子');
    expect(document.renderedHtml).toContain('https://x.com/demo/status/001');
    expect(document.summaryJson).toEqual(
      expect.objectContaining({
        summary: '本周重点集中在 agent 工作流与部署效率。',
        highlights: [
          expect.objectContaining({
            archivedPostId: 'archive-001',
            authorUsername: 'demo_author',
          }),
        ],
      }),
    );
  });

  it('rejects invalid JSON or missing summary in model output', () => {
    expect(() =>
      service.parseModelOutput('not json', {
        aggregate: createAggregate(),
        fallbackTitle: 'Fallback title',
      }),
    ).toThrow(BadRequestException);

    expect(() =>
      service.parseModelOutput(
        JSON.stringify({
          title: 'AI 周报',
          overview: '只有正文没有摘要，这里应该被判定为无效结果。',
        }),
        {
          aggregate: createAggregate(),
          fallbackTitle: 'Fallback title',
        },
      ),
    ).toThrow('missing a usable summary');
  });
});
