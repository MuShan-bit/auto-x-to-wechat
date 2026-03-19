import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CrawlJobsService } from './crawl-jobs.service';

type DueCrawlJobSnapshot = {
  bindingId: string;
  bindingUserId: string;
  jobId: string;
  nextRunAt: string | null;
  username: string;
};

@Injectable()
export class CrawlJobsScheduler {
  private readonly logger = new Logger(CrawlJobsScheduler.name);

  constructor(private readonly crawlJobsService: CrawlJobsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMinuteScan() {
    await this.scanDueJobs();
  }

  async scanDueJobs(now = new Date()) {
    const dueJobs = await this.crawlJobsService.findDueJobs({
      now,
      limit: 100,
    });
    const jobs: DueCrawlJobSnapshot[] = dueJobs.map((job) => ({
      jobId: job.id,
      bindingId: job.bindingId,
      bindingUserId: job.binding.userId,
      username: job.binding.username,
      nextRunAt: job.nextRunAt?.toISOString() ?? null,
    }));

    if (jobs.length > 0) {
      this.logger.log(`Discovered ${jobs.length} due crawl jobs`);
    } else {
      this.logger.debug('No due crawl jobs found in this scan window');
    }

    return {
      jobs,
      scannedAt: now.toISOString(),
      total: jobs.length,
    };
  }
}
