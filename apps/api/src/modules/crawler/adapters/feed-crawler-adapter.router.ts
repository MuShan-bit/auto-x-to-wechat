import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockFeedCrawlerAdapter } from './mock-feed-crawler.adapter';
import { RealFeedCrawlerAdapter } from './real-feed-crawler.adapter';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import type { CrawlerAdapterName } from '../crawler.constants';

type AdapterPayload = {
  adapter?: string;
};

@Injectable()
export class FeedCrawlerAdapterRouter implements FeedCrawlerAdapter {
  readonly name = 'router';

  constructor(
    private readonly configService: ConfigService,
    private readonly mockAdapter: MockFeedCrawlerAdapter,
    private readonly realAdapter: RealFeedCrawlerAdapter,
  ) {}

  validateCredential(payload: string): Promise<BindingProfile> {
    return this.resolveAdapterFromPayload(payload).validateCredential(payload);
  }

  fetchHotFeed(payload: string): Promise<RawFeedResponse> {
    return this.resolveAdapterFromPayload(payload).fetchHotFeed(payload);
  }

  fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    return this.resolveAdapterFromPayload(payload).fetchRecommendedFeed(
      payload,
    );
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    return this.resolveAdapterFromRaw(raw).normalizePosts(raw);
  }

  private resolveAdapterFromPayload(payload: string) {
    const explicitAdapter = this.extractAdapterFromPayload(payload);

    if (explicitAdapter === 'real') {
      return this.realAdapter;
    }

    if (explicitAdapter === 'mock') {
      return this.mockAdapter;
    }

    return this.getDefaultAdapter();
  }

  private resolveAdapterFromRaw(raw: RawFeedResponse) {
    if (raw.adapter === 'real') {
      return this.realAdapter;
    }

    if (raw.adapter === 'mock') {
      return this.mockAdapter;
    }

    return this.getDefaultAdapter();
  }

  private getDefaultAdapter() {
    const adapterName = this.configService.get<CrawlerAdapterName>(
      'CRAWLER_ADAPTER_NAME',
      'mock',
    );

    return adapterName === 'real' ? this.realAdapter : this.mockAdapter;
  }

  private extractAdapterFromPayload(payload: string) {
    if (!payload.trim()) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(payload) as AdapterPayload;

      if (typeof parsed !== 'object' || parsed === null) {
        return undefined;
      }

      if (parsed.adapter === 'real' || parsed.adapter === 'mock') {
        return parsed.adapter;
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
