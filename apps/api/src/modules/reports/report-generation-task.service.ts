import { ReportStatus, ReportType } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AiGatewayService } from '../ai-gateway/ai-gateway.service';
import type { GenerateReportDto } from './dto/generate-report.dto';
import { ReportAggregationService } from './report-aggregation.service';
import { ReportGenerationService } from './report-generation.service';
import { ReportsService } from './reports.service';

type GeneratedReportType = 'WEEKLY' | 'MONTHLY';

@Injectable()
export class ReportGenerationTaskService {
  constructor(
    private readonly reportAggregationService: ReportAggregationService,
    private readonly reportsService: ReportsService,
    private readonly aiGatewayService: AiGatewayService,
    private readonly reportGenerationService: ReportGenerationService,
  ) {}

  async generateReport(
    userId: string,
    input: GenerateReportDto,
  ) {
    const reportType = this.normalizeReportType(input.reportType);
    const periodStart = this.parseRequiredDate(
      input.periodStart,
      'Report period start is invalid',
    );
    const periodEnd = this.parseRequiredDate(
      input.periodEnd,
      'Report period end is invalid',
    );

    const aggregate = await this.reportAggregationService.aggregatePeriodForUser(
      userId,
      {
        bindingIds: input.bindingIds,
        categoryIds: input.categoryIds,
        tagIds: input.tagIds,
        modes: input.modes,
        postLimit: input.postLimit,
        periodStart,
        periodEnd,
      },
    );

    if (aggregate.totalPosts === 0 || aggregate.posts.length === 0) {
      throw new BadRequestException(
        'No archived posts matched the selected report filters',
      );
    }

    const fallbackTitle = this.reportGenerationService.buildFallbackTitle(
      reportType,
      periodStart,
      periodEnd,
    );
    const pendingDocument =
      this.reportGenerationService.buildPendingReportDocument(fallbackTitle);
    const report = await this.reportsService.createReportForUser(userId, {
      reportType,
      title: fallbackTitle,
      periodStart,
      periodEnd,
      status: ReportStatus.DRAFT,
      sourcePosts: aggregate.posts.map((post) => ({
        archivedPostId: post.archivedPostId,
      })),
      richTextJson: pendingDocument.richTextJson,
      renderedHtml: pendingDocument.renderedHtml,
      summaryJson: this.reportGenerationService.buildPendingSummary({
        aggregate,
        periodStart,
        periodEnd,
        reportType,
      }),
    });

    try {
      const gatewayResult = await this.aiGatewayService.generateText(
        userId,
        this.reportGenerationService.buildAiRequest({
          aggregate,
          modelConfigId: input.modelConfigId,
          periodStart,
          periodEnd,
          reportId: report.id,
          reportType,
        }),
      );
      const parsedResult = this.reportGenerationService.parseModelOutput(
        gatewayResult.text,
        {
          aggregate,
          fallbackTitle,
        },
      );
      const successDocument =
        this.reportGenerationService.buildSuccessReportDocument({
          aggregate,
          parsedResult,
          periodStart,
          periodEnd,
          reportType,
        });

      return this.reportsService.updateReportForUser(userId, report.id, {
        title: parsedResult.title,
        status: ReportStatus.READY,
        richTextJson: successDocument.richTextJson,
        renderedHtml: successDocument.renderedHtml,
        summaryJson: successDocument.summaryJson,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'AI report generation failed';
      const failedDocument = this.reportGenerationService.buildFailedReportDocument(
        fallbackTitle,
        errorMessage,
      );

      await this.reportsService.updateReportForUser(userId, report.id, {
        status: ReportStatus.FAILED,
        richTextJson: failedDocument.richTextJson,
        renderedHtml: failedDocument.renderedHtml,
        summaryJson: this.reportGenerationService.buildFailedSummary({
          aggregate,
          errorMessage,
          periodStart,
          periodEnd,
          reportType,
        }),
      });

      throw error;
    }
  }

  private normalizeReportType(reportType: ReportType): GeneratedReportType {
    if (reportType === ReportType.WEEKLY || reportType === ReportType.MONTHLY) {
      return reportType;
    }

    throw new BadRequestException(
      'Only weekly and monthly reports are supported right now',
    );
  }

  private parseRequiredDate(value: Date | string, message: string) {
    const parsedDate = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(message);
    }

    return parsedDate;
  }
}
