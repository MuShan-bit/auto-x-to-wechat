import { BindingStatus } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type FindDueCrawlJobsOptions = {
  limit?: number;
  now?: Date;
};

type UpdateCrawlJobScheduleInput = {
  enabled?: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
};

@Injectable()
export class CrawlJobsService {
  constructor(private readonly prisma: PrismaService) {}

  getByBindingId(bindingId: string) {
    return this.prisma.crawlJob.findUnique({
      where: { bindingId },
      include: { binding: true },
    });
  }

  findDueJobs(options: FindDueCrawlJobsOptions = {}) {
    const { now = new Date(), limit = 20 } = options;

    return this.prisma.crawlJob.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now,
        },
        binding: {
          crawlEnabled: true,
          status: BindingStatus.ACTIVE,
        },
      },
      include: { binding: true },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });
  }

  updateSchedule(jobId: string, input: UpdateCrawlJobScheduleInput) {
    return this.prisma.crawlJob.update({
      where: { id: jobId },
      data: {
        enabled: input.enabled,
        lastRunAt: input.lastRunAt,
        nextRunAt: input.nextRunAt,
      },
      include: { binding: true },
    });
  }
}
