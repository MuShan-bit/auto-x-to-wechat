import { CrawlRunStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
    const failureStatuses = [CrawlRunStatus.FAILED, CrawlRunStatus.PARTIAL_FAILED];
    const binding = await this.prisma.xAccountBinding.findFirst({
      where: { userId },
      include: {
        crawlJob: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const latestRun = binding
      ? await this.prisma.crawlRun.findFirst({
          where: {
            bindingId: binding.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
      : null;

    const archiveCount = binding
      ? await this.prisma.archivedPost.count({
          where: {
            bindingId: binding.id,
          },
        })
      : 0;
    const errorSummary = binding
      ? await this.buildErrorSummary(binding.id, failureStatuses)
      : {
          failedPostCount: 0,
          failedRunCount: 0,
          recentFailures: [],
        };

    return {
      binding,
      latestRun,
      nextRunAt: binding?.crawlJob?.nextRunAt ?? binding?.nextCrawlAt ?? null,
      archiveCount,
      errorSummary,
    };
  }

  private async buildErrorSummary(
    bindingId: string,
    failureStatuses: CrawlRunStatus[],
  ) {
    const [failedRunCount, failedPostAggregate, recentFailures] =
      await this.prisma.$transaction([
        this.prisma.crawlRun.count({
          where: {
            bindingId,
            status: {
              in: failureStatuses,
            },
          },
        }),
        this.prisma.crawlRun.aggregate({
          where: {
            bindingId,
            status: {
              in: failureStatuses,
            },
          },
          _sum: {
            failedCount: true,
          },
        }),
        this.prisma.crawlRun.findMany({
          where: {
            bindingId,
            status: {
              in: failureStatuses,
            },
          },
          select: {
            id: true,
            status: true,
            triggerType: true,
            errorMessage: true,
            failedCount: true,
            createdAt: true,
            finishedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        }),
      ]);

    return {
      failedRunCount,
      failedPostCount: failedPostAggregate._sum.failedCount ?? 0,
      recentFailures,
    };
  }
}
