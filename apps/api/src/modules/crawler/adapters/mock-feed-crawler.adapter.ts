import { Injectable } from '@nestjs/common';
import { MediaType, PostType, RelationType } from '@prisma/client';
import { normalizeRawFeedPosts } from '../crawler-normalizer';
import { retryCrawlerOperation } from '../crawler-retry';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import {
  CrawlerAuthError,
  CrawlerNetworkError,
  CrawlerRateLimitError,
  CrawlerStructureChangedError,
} from '../errors/crawler-adapter.error';

type MockFailureMode = 'AUTH' | 'NETWORK' | 'RATE_LIMIT' | 'STRUCTURE_CHANGED';

type MockCredentialPayload = {
  avatarUrl?: string;
  cookie?: string;
  displayName?: string;
  failTimes?: number;
  failureMode?: MockFailureMode;
  username?: string;
  xUserId?: string;
};

@Injectable()
export class MockFeedCrawlerAdapter implements FeedCrawlerAdapter {
  readonly name = 'mock';

  validateCredential(payload: string): Promise<BindingProfile> {
    const parsed = this.parseCredential(payload);

    if (parsed.failureMode === 'AUTH') {
      return Promise.reject(
        new CrawlerAuthError('Mock crawler rejected the credential'),
      );
    }

    return Promise.resolve({
      xUserId: parsed.xUserId,
      username: parsed.username,
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    });
  }

  async fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    return this.fetchMockFeed(payload, 'recommended');
  }

  async fetchHotFeed(payload: string): Promise<RawFeedResponse> {
    return this.fetchMockFeed(payload, 'hot');
  }

  async fetchSearchFeed(
    payload: string,
    queryText: string,
  ): Promise<RawFeedResponse> {
    return this.fetchMockFeed(payload, 'search', queryText);
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    return Promise.resolve(normalizeRawFeedPosts(raw));
  }

  private async fetchMockFeed(
    payload: string,
    feedKind: 'recommended' | 'hot' | 'search',
    queryText?: string,
  ): Promise<RawFeedResponse> {
    const profile = await this.validateCredential(payload);
    const parsed = this.parseCredential(payload);
    let attempt = 0;

    return retryCrawlerOperation(
      () => {
        attempt += 1;
        this.throwMockFailure(parsed, attempt);

        return this.buildMockResponse(profile, attempt, feedKind, queryText);
      },
      {
        baseDelayMs: 0,
      },
    );
  }

  private parseCredential(payload: string): MockCredentialPayload {
    if (!payload.trim()) {
      throw new CrawlerAuthError('Credential payload cannot be empty');
    }

    try {
      const parsed = JSON.parse(payload) as MockCredentialPayload;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new CrawlerAuthError('Credential payload must be a JSON object');
      }

      if (
        typeof parsed.cookie !== 'string' &&
        typeof parsed.username !== 'string' &&
        typeof parsed.xUserId !== 'string'
      ) {
        throw new CrawlerAuthError(
          'Mock credential requires at least cookie, username or xUserId',
        );
      }

      return parsed;
    } catch (error) {
      if (error instanceof CrawlerAuthError) {
        throw error;
      }

      throw new CrawlerAuthError('Credential payload must be valid JSON');
    }
  }

  private buildMockResponse(
    profile: BindingProfile,
    attempt: number,
    feedKind: 'recommended' | 'hot' | 'search',
    queryText?: string,
  ): RawFeedResponse {
    const now = new Date().toISOString();
    const sanitizedQueryText =
      queryText?.trim().replace(/\s+/g, '-').toLowerCase() || 'default-search';
    const source =
      feedKind === 'hot'
        ? 'mock-hot'
        : feedKind === 'search'
          ? 'mock-search'
          : 'mock';
    const firstPostId =
      feedKind === 'hot'
        ? 'mock-hot-post-001'
        : feedKind === 'search'
          ? `mock-search-${sanitizedQueryText}-001`
          : 'mock-post-001';
    const secondPostId =
      feedKind === 'hot'
        ? 'mock-hot-post-002'
        : feedKind === 'search'
          ? `mock-search-${sanitizedQueryText}-002`
          : 'mock-post-002';

    return {
      adapter: this.name,
      fetchedAt: now,
      metadata: {
        attempts: attempt,
        source,
        username: profile.username ?? 'mock_user',
      },
      posts: [
        {
          xPostId: firstPostId,
          postUrl: `https://x.com/mock_user/status/${firstPostId}`,
          postType: PostType.POST,
          author: {
            xUserId: 'x_author_001',
            username: 'openai_news',
            displayName: 'OpenAI Newsroom',
            avatarUrl: 'https://images.example.com/openai-newsroom.png',
          },
          rawText:
            feedKind === 'hot'
              ? 'Trending now: this hot-feed mock post verifies the explore capture flow.'
              : feedKind === 'search'
                ? `Search feed hit for "${queryText ?? 'default search'}" verifies the custom search capture flow.`
              : 'GPT-5.4 release notes are live. This mock post helps us verify archive flows.',
          sourceCreatedAt: now,
          language: 'en',
          entities: {
            mentions: [],
            hashtags: [{ tag: 'AI', start: 0, end: 3 }],
            urls: [
              {
                url: 'https://openai.com',
                displayUrl: 'openai.com',
                start: 42,
                end: 60,
              },
            ],
          },
          media: [
            {
              mediaType: MediaType.IMAGE,
              sourceUrl: 'https://images.example.com/mock-post-001.png',
              previewUrl:
                'https://images.example.com/mock-post-001-preview.png',
              width: 1200,
              height: 675,
              altText: 'Mock preview image',
            },
          ],
          metrics: {
            replyCount: 12,
            repostCount: 34,
            quoteCount: 3,
            favoriteCount: 256,
            viewCount: 2048,
          },
          rawPayload: {
            id: firstPostId,
            adapter: this.name,
            feedKind,
            queryText,
          },
        },
        {
          xPostId: secondPostId,
          postUrl: `https://x.com/mock_user/status/${secondPostId}`,
          postType: PostType.QUOTE,
          author: {
            xUserId: 'x_author_002',
            username: 'product_updates',
            displayName: 'Product Updates',
          },
          rawText:
            feedKind === 'hot'
              ? 'Quoting a hot topic observation from the explore feed for pagination testing.'
              : feedKind === 'search'
                ? `Quoting another search result about "${queryText ?? 'default search'}" for pagination testing.`
              : 'Quoting a trend observation from the recommendation feed for pagination testing.',
          sourceCreatedAt: now,
          language: 'en',
          entities: {
            mentions: [{ username: 'openai_news', start: 8, end: 20 }],
            hashtags: [],
            urls: [],
          },
          media: [],
          relations: [
            {
              relationType: RelationType.QUOTE,
              targetXPostId: 'mock-post-quoted-001',
              targetUrl: 'https://x.com/openai_news/status/mock-post-quoted-001',
              targetAuthorUsername: 'openai_news',
              snapshotJson: {
                previewText: 'Quoted recommendation feed item',
              },
            },
          ],
          metrics: {
            replyCount: 2,
            repostCount: 5,
            quoteCount: 1,
            favoriteCount: 18,
            viewCount: 320,
          },
          rawPayload: {
            id: secondPostId,
            adapter: this.name,
            feedKind,
            queryText,
          },
        },
      ],
    };
  }

  private throwMockFailure(payload: MockCredentialPayload, attempt: number) {
    const maxFailures = payload.failTimes ?? Number.POSITIVE_INFINITY;

    if (!payload.failureMode || attempt > maxFailures) {
      return;
    }

    switch (payload.failureMode) {
      case 'AUTH':
        return;
      case 'NETWORK':
        throw new CrawlerNetworkError(
          `Mock crawler network failure on attempt ${attempt}`,
        );
      case 'RATE_LIMIT':
        throw new CrawlerRateLimitError(
          `Mock crawler rate limited on attempt ${attempt}`,
          0,
        );
      case 'STRUCTURE_CHANGED':
        throw new CrawlerStructureChangedError(
          'Mock crawler detected an unsupported upstream response shape',
        );
    }
  }
}
