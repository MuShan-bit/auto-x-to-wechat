import { ReportStatus, ReportType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import type { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import type { GenerateReportDto } from './dto/generate-report.dto';
import type { ReportAggregationService } from './report-aggregation.service';
import type { ReportGenerationService } from './report-generation.service';
import { ReportGenerationTaskService } from './report-generation-task.service';
import type { ReportsService } from './reports.service';

function createAggregate() {
  return {
    totalPosts: 2,
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
    periodEnd: new Date('2026-03-08T00:00:00.000Z'),
    filters: {
      bindingIds: ['binding-001'],
      categoryIds: [],
      tagIds: [],
      modes: [],
    },
    bindings: [],
    modes: [],
    categories: [],
    tags: [],
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
        modes: [],
        primaryCategory: null,
        rawText: '第一条归档帖子',
        sourceCreatedAt: new Date('2026-03-06T10:00:00.000Z'),
        tags: [],
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
        modes: [],
        primaryCategory: null,
        rawText: '第二条归档帖子',
        sourceCreatedAt: new Date('2026-03-05T08:00:00.000Z'),
        tags: [],
      },
    ],
  };
}

describe('ReportGenerationTaskService', () => {
  let service: ReportGenerationTaskService;
  let reportAggregationService: {
    aggregatePeriodForUser: jest.Mock;
  };
  let reportsService: {
    createReportForUser: jest.Mock;
    updateReportForUser: jest.Mock;
  };
  let aiGatewayService: {
    generateText: jest.Mock;
  };
  let reportGenerationService: {
    buildAiRequest: jest.Mock;
    buildFallbackTitle: jest.Mock;
    buildFailedReportDocument: jest.Mock;
    buildFailedSummary: jest.Mock;
    buildPendingReportDocument: jest.Mock;
    buildPendingSummary: jest.Mock;
    buildSuccessReportDocument: jest.Mock;
    parseModelOutput: jest.Mock;
  };

  const dto: GenerateReportDto = {
    reportType: ReportType.WEEKLY,
    periodStart: '2026-03-01T00:00:00.000Z',
    periodEnd: '2026-03-08T00:00:00.000Z',
  };

  beforeEach(() => {
    reportAggregationService = {
      aggregatePeriodForUser: jest.fn().mockResolvedValue(createAggregate()),
    };
    reportsService = {
      createReportForUser: jest.fn().mockResolvedValue({
        id: 'report-001',
      }),
      updateReportForUser: jest.fn().mockResolvedValue({
        id: 'report-001',
        status: ReportStatus.READY,
      }),
    };
    aiGatewayService = {
      generateText: jest.fn().mockResolvedValue({
        text: '{"title":"AI 周报","summary":"摘要","overview":"正文够长够长够长够长够长够长","keyThemes":[],"notableInsights":[],"publishingIdeas":[],"highlights":[]}',
      }),
    };
    reportGenerationService = {
      buildAiRequest: jest.fn().mockReturnValue({
        taskType: 'REPORT_SUMMARY',
        responseFormat: 'json_object',
        messages: [],
      }),
      buildFallbackTitle: jest.fn().mockReturnValue('Fallback title'),
      buildFailedReportDocument: jest.fn().mockReturnValue({
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>failed</p>',
      }),
      buildFailedSummary: jest.fn().mockReturnValue({
        generationStatus: 'FAILED',
      }),
      buildPendingReportDocument: jest.fn().mockReturnValue({
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>pending</p>',
      }),
      buildPendingSummary: jest.fn().mockReturnValue({
        generationStatus: 'PENDING',
      }),
      buildSuccessReportDocument: jest.fn().mockReturnValue({
        richTextJson: { version: 1, blocks: [] },
        renderedHtml: '<p>ready</p>',
        summaryJson: {
          summary: '摘要',
        },
      }),
      parseModelOutput: jest.fn().mockReturnValue({
        title: 'AI 周报',
        summary: '摘要',
        overview: '正文够长够长够长够长够长够长',
        keyThemes: [],
        notableInsights: [],
        publishingIdeas: [],
        highlights: [],
      }),
    };

    service = new ReportGenerationTaskService(
      reportAggregationService as unknown as ReportAggregationService,
      reportsService as unknown as ReportsService,
      aiGatewayService as unknown as AiGatewayService,
      reportGenerationService as unknown as ReportGenerationService,
    );
  });

  it('creates a draft report and updates it to READY after AI generation succeeds', async () => {
    const result = await service.generateReport('report-owner', dto);

    expect(reportAggregationService.aggregatePeriodForUser).toHaveBeenCalledWith(
      'report-owner',
      expect.objectContaining({
        periodStart: new Date('2026-03-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-08T00:00:00.000Z'),
      }),
    );
    expect(reportsService.createReportForUser).toHaveBeenCalledWith(
      'report-owner',
      expect.objectContaining({
        reportType: ReportType.WEEKLY,
        title: 'Fallback title',
        status: ReportStatus.DRAFT,
        sourcePosts: [
          { archivedPostId: 'archive-001' },
          { archivedPostId: 'archive-002' },
        ],
      }),
    );
    expect(aiGatewayService.generateText).toHaveBeenCalledWith(
      'report-owner',
      expect.objectContaining({
        taskType: 'REPORT_SUMMARY',
      }),
    );
    expect(reportsService.updateReportForUser).toHaveBeenCalledWith(
      'report-owner',
      'report-001',
      expect.objectContaining({
        title: 'AI 周报',
        status: ReportStatus.READY,
      }),
    );
    expect(result).toEqual({
      id: 'report-001',
      status: ReportStatus.READY,
    });
  });

  it('marks the report as FAILED when AI generation throws', async () => {
    aiGatewayService.generateText.mockRejectedValueOnce(
      new Error('provider timeout'),
    );

    await expect(service.generateReport('report-owner', dto)).rejects.toThrow(
      'provider timeout',
    );

    expect(reportsService.updateReportForUser).toHaveBeenCalledWith(
      'report-owner',
      'report-001',
      expect.objectContaining({
        status: ReportStatus.FAILED,
      }),
    );
  });

  it('rejects report generation when no archived posts match the filters', async () => {
    reportAggregationService.aggregatePeriodForUser.mockResolvedValueOnce({
      ...createAggregate(),
      totalPosts: 0,
      posts: [],
    });

    await expect(service.generateReport('report-owner', dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(reportsService.createReportForUser).not.toHaveBeenCalled();
  });
});
