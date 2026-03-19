import { Module } from '@nestjs/common';
import { FeedCrawlerAdapterRouter } from './adapters/feed-crawler-adapter.router';
import { MockFeedCrawlerAdapter } from './adapters/mock-feed-crawler.adapter';
import { RealFeedCrawlerAdapter } from './adapters/real-feed-crawler.adapter';
import { FEED_CRAWLER_ADAPTER } from './crawler.constants';
import { XBrowserAutomationService } from './x-browser-automation.service';

@Module({
  providers: [
    MockFeedCrawlerAdapter,
    RealFeedCrawlerAdapter,
    FeedCrawlerAdapterRouter,
    XBrowserAutomationService,
    {
      provide: FEED_CRAWLER_ADAPTER,
      useExisting: FeedCrawlerAdapterRouter,
    },
  ],
  exports: [FEED_CRAWLER_ADAPTER, XBrowserAutomationService],
})
export class CrawlerModule {}
