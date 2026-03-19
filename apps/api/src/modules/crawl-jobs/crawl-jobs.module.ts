import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlJobsScheduler } from './crawl-jobs.scheduler';
import { CrawlJobsService } from './crawl-jobs.service';

@Module({
  imports: [PrismaModule],
  providers: [CrawlJobsService, CrawlJobsScheduler],
  exports: [CrawlJobsService, CrawlJobsScheduler],
})
export class CrawlJobsModule {}
