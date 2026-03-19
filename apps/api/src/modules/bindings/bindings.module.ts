import { Module } from '@nestjs/common';
import { CrawlJobsModule } from '../crawl-jobs/crawl-jobs.module';
import { CryptoModule } from '../crypto/crypto.module';
import { CrawlerModule } from '../crawler/crawler.module';
import { BindingBrowserSessionsController } from './binding-browser-sessions.controller';
import { BindingBrowserSessionsService } from './binding-browser-sessions.service';
import { BindingsController } from './bindings.controller';
import { BindingsService } from './bindings.service';

@Module({
  imports: [CryptoModule, CrawlerModule, CrawlJobsModule],
  controllers: [BindingsController, BindingBrowserSessionsController],
  providers: [BindingsService, BindingBrowserSessionsService],
})
export class BindingsModule {}
