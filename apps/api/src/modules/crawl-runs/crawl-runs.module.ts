import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlRunsService } from './crawl-runs.service';

@Module({
  imports: [PrismaModule],
  providers: [CrawlRunsService],
  exports: [CrawlRunsService],
})
export class CrawlRunsModule {}
