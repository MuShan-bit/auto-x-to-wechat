import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlRunPostsService } from './crawl-run-posts.service';
import { CrawlRunsController } from './crawl-runs.controller';
import { CrawlRunsService } from './crawl-runs.service';

@Module({
  imports: [PrismaModule],
  controllers: [CrawlRunsController],
  providers: [CrawlRunsService, CrawlRunPostsService],
  exports: [CrawlRunsService, CrawlRunPostsService],
})
export class CrawlRunsModule {}
