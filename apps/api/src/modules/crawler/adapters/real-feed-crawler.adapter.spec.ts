import type { RawFeedResponse } from '../crawler.types';
import { XBrowserAutomationService } from '../x-browser-automation.service';
import { RealFeedCrawlerAdapter } from './real-feed-crawler.adapter';

describe('RealFeedCrawlerAdapter', () => {
  const payload = {
    adapter: 'real' as const,
    authToken: 'auth-token-demo',
    avatarUrl: 'https://images.example.com/browser-owner.png',
    capturedAt: '2026-03-19T00:00:00.000Z',
    cookies: [
      {
        domain: '.x.com',
        expires: -1,
        httpOnly: true,
        name: 'auth_token',
        path: '/',
        sameSite: 'Lax' as const,
        secure: true,
        value: 'auth-token-demo',
      },
    ],
    ct0: 'ct0-demo',
    displayName: 'Browser Owner',
    loginUrl: 'https://x.com/i/flow/login',
    username: 'browser_owner',
    xUserId: 'x-browser-001',
  };

  it('delegates real feed fetching to browser automation with parsed payload', async () => {
    const expectedResponse = {
      adapter: 'real',
      fetchedAt: '2026-03-19T00:00:00.000Z',
      posts: [],
    } satisfies RawFeedResponse;
    const fetchRecommendedFeed = jest.fn().mockResolvedValue(expectedResponse);
    const browserAutomationService = {
      fetchRecommendedFeed,
    } as unknown as XBrowserAutomationService;
    const adapter = new RealFeedCrawlerAdapter(browserAutomationService);

    const rawFeed = await adapter.fetchRecommendedFeed(JSON.stringify(payload));

    expect(fetchRecommendedFeed).toHaveBeenCalledWith(payload);
    expect(rawFeed).toEqual(expectedResponse);
  });
});
