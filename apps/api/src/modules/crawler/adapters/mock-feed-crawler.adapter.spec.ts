import { MockFeedCrawlerAdapter } from './mock-feed-crawler.adapter';
import {
  CrawlerAuthError,
  CrawlerNetworkError,
  CrawlerRateLimitError,
  CrawlerStructureChangedError,
} from '../errors/crawler-adapter.error';

describe('MockFeedCrawlerAdapter', () => {
  const adapter = new MockFeedCrawlerAdapter();

  it('rejects invalid credentials with auth classification', async () => {
    await expect(
      adapter.validateCredential(
        JSON.stringify({
          cookie: 'demo-cookie',
          failureMode: 'AUTH',
        }),
      ),
    ).rejects.toBeInstanceOf(CrawlerAuthError);
  });

  it('retries retryable network failures before succeeding', async () => {
    const response = await adapter.fetchRecommendedFeed(
      JSON.stringify({
        cookie: 'demo-cookie',
        failureMode: 'NETWORK',
        failTimes: 1,
      }),
    );

    expect(response.metadata).toMatchObject({
      attempts: 2,
      source: 'mock',
    });
  });

  it('returns a distinct hot-feed payload for trending mode', async () => {
    const response = await adapter.fetchHotFeed(
      JSON.stringify({
        cookie: 'demo-cookie',
      }),
    );

    expect(response.metadata).toMatchObject({
      source: 'mock-hot',
    });
    expect(response.posts[0]?.xPostId).toBe('mock-hot-post-001');
  });

  it('returns a search-feed payload keyed by the query text', async () => {
    const response = await adapter.fetchSearchFeed(
      JSON.stringify({
        cookie: 'demo-cookie',
      }),
      'AI agents',
    );

    expect(response.metadata).toMatchObject({
      source: 'mock-search',
    });
    expect(response.posts[0]?.xPostId).toContain('mock-search-ai-agents');
  });

  it('classifies exhausted network retries as network errors', async () => {
    await expect(
      adapter.fetchRecommendedFeed(
        JSON.stringify({
          cookie: 'demo-cookie',
          failureMode: 'NETWORK',
          failTimes: 3,
        }),
      ),
    ).rejects.toMatchObject({
      code: 'NETWORK',
      retryable: true,
    } satisfies Partial<CrawlerNetworkError>);
  });

  it('classifies rate limit failures separately from network failures', async () => {
    await expect(
      adapter.fetchRecommendedFeed(
        JSON.stringify({
          cookie: 'demo-cookie',
          failureMode: 'RATE_LIMIT',
          failTimes: 3,
        }),
      ),
    ).rejects.toBeInstanceOf(CrawlerRateLimitError);
  });

  it('marks upstream structure changes as non-retryable parse failures', async () => {
    await expect(
      adapter.fetchRecommendedFeed(
        JSON.stringify({
          cookie: 'demo-cookie',
          failureMode: 'STRUCTURE_CHANGED',
        }),
      ),
    ).rejects.toBeInstanceOf(CrawlerStructureChangedError);
  });
});
