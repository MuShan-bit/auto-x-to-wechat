import { ConfigService } from '@nestjs/config';
import type {
  BindingProfile,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import { FeedCrawlerAdapterRouter } from './feed-crawler-adapter.router';
import { MockFeedCrawlerAdapter } from './mock-feed-crawler.adapter';
import { RealFeedCrawlerAdapter } from './real-feed-crawler.adapter';

describe('FeedCrawlerAdapterRouter', () => {
  const profile = {
    username: 'browser_owner',
  } satisfies BindingProfile;
  const rawFeed = {
    adapter: 'real',
    fetchedAt: '2026-03-19T00:00:00.000Z',
    posts: [],
  } satisfies RawFeedResponse;
  const normalizedPosts = [] satisfies NormalizedPost[];
  const realPayload = JSON.stringify({
    adapter: 'real',
    cookies: [
      {
        domain: '.x.com',
        expires: -1,
        httpOnly: true,
        name: 'auth_token',
        path: '/',
        secure: true,
        value: 'auth-token-demo',
      },
    ],
    loginUrl: 'https://x.com/i/flow/login',
    capturedAt: '2026-03-19T00:00:00.000Z',
  });

  it('routes payloads with adapter real to the real adapter even when default is mock', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('mock'),
    } as unknown as ConfigService;
    const mockValidateCredential = jest.fn();
    const mockFetchHotFeed = jest.fn();
    const mockFetchRecommendedFeed = jest.fn();
    const mockNormalizePosts = jest.fn();
    const mockAdapter = {
      validateCredential: mockValidateCredential,
      fetchHotFeed: mockFetchHotFeed,
      fetchRecommendedFeed: mockFetchRecommendedFeed,
      normalizePosts: mockNormalizePosts,
    } as unknown as MockFeedCrawlerAdapter;
    const realValidateCredential = jest.fn().mockResolvedValue(profile);
    const realFetchHotFeed = jest.fn().mockResolvedValue(rawFeed);
    const realFetchRecommendedFeed = jest.fn().mockResolvedValue(rawFeed);
    const realNormalizePosts = jest.fn().mockResolvedValue(normalizedPosts);
    const realAdapter = {
      validateCredential: realValidateCredential,
      fetchHotFeed: realFetchHotFeed,
      fetchRecommendedFeed: realFetchRecommendedFeed,
      normalizePosts: realNormalizePosts,
    } as unknown as RealFeedCrawlerAdapter;
    const router = new FeedCrawlerAdapterRouter(
      configService,
      mockAdapter,
      realAdapter,
    );

    await expect(router.validateCredential(realPayload)).resolves.toEqual(
      profile,
    );
    await expect(router.fetchHotFeed(realPayload)).resolves.toEqual(rawFeed);
    await expect(router.fetchRecommendedFeed(realPayload)).resolves.toEqual(
      rawFeed,
    );
    await expect(router.normalizePosts(rawFeed)).resolves.toEqual(
      normalizedPosts,
    );

    expect(realValidateCredential).toHaveBeenCalledWith(realPayload);
    expect(realFetchHotFeed).toHaveBeenCalledWith(realPayload);
    expect(realFetchRecommendedFeed).toHaveBeenCalledWith(realPayload);
    expect(realNormalizePosts).toHaveBeenCalledWith(rawFeed);
    expect(mockValidateCredential).not.toHaveBeenCalled();
    expect(mockFetchHotFeed).not.toHaveBeenCalled();
    expect(mockFetchRecommendedFeed).not.toHaveBeenCalled();
    expect(mockNormalizePosts).not.toHaveBeenCalled();
  });
});
