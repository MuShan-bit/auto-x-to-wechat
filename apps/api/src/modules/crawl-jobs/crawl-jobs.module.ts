import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlJobsService } from './crawl-jobs.service';

@Module({
  imports: [PrismaModule],
  providers: [CrawlJobsService],
  exports: [CrawlJobsService],
})
export class CrawlJobsModule {}
