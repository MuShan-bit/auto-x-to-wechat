import { CrawlRunStatus, CrawlTriggerType, type Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateCrawlRunInput = {
  bindingId: string;
  crawlJobId?: string | null;
  triggerType: CrawlTriggerType;
};

type CompleteCrawlRunInput = {
  errorMessage?: string | null;
  failedCount?: number;
  fetchedCount?: number;
  finishedAt?: Date;
  newCount?: number;
  skippedCount?: number;
  status: CrawlRunStatus;
};

@Injectable()
export class CrawlRunsService {
  constructor(private readonly prisma: PrismaService) {}

  createQueuedRun(input: CreateCrawlRunInput) {
    return this.prisma.crawlRun.create({
      data: {
        bindingId: input.bindingId,
        crawlJobId: input.crawlJobId ?? null,
        triggerType: input.triggerType,
        status: CrawlRunStatus.QUEUED,
      },
      include: {
        binding: true,
        crawlJob: true,
      },
    });
  }

  getById(id: string) {
    return this.prisma.crawlRun.findUnique({
      where: { id },
      include: {
        binding: true,
        crawlJob: true,
        runPosts: true,
      },
    });
  }

  markRunning(id: string, startedAt = new Date()) {
    return this.prisma.crawlRun.update({
      where: { id },
      data: {
        status: CrawlRunStatus.RUNNING,
        startedAt,
      },
      include: {
        binding: true,
        crawlJob: true,
      },
    });
  }

  markCompleted(id: string, input: CompleteCrawlRunInput) {
    const data: Prisma.CrawlRunUpdateInput = {
      status: input.status,
      finishedAt: input.finishedAt ?? new Date(),
      fetchedCount: input.fetchedCount ?? 0,
      newCount: input.newCount ?? 0,
      skippedCount: input.skippedCount ?? 0,
      failedCount: input.failedCount ?? 0,
      errorMessage: input.errorMessage ?? null,
    };

    return this.prisma.crawlRun.update({
      where: { id },
      data,
      include: {
        binding: true,
        crawlJob: true,
        runPosts: true,
      },
    });
  }
}
