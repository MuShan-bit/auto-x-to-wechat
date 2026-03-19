import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(userId: string) {
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

    return {
      binding,
      latestRun,
      nextRunAt: binding?.crawlJob?.nextRunAt ?? binding?.nextCrawlAt ?? null,
      archiveCount,
    };
  }
}
