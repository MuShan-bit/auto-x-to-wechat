import { Injectable } from '@nestjs/common';
import { normalizeRawFeedPosts } from '../crawler-normalizer';
import type {
  BindingProfile,
  FeedCrawlerAdapter,
  NormalizedPost,
  RawFeedResponse,
} from '../crawler.types';
import { CrawlerAuthError } from '../errors/crawler-adapter.error';
import { XBrowserAutomationService } from '../x-browser-automation.service';
import type { RealBrowserCredentialPayload } from '../x-browser.types';

@Injectable()
export class RealFeedCrawlerAdapter implements FeedCrawlerAdapter {
  readonly name = 'real';

  constructor(
    private readonly xBrowserAutomationService: XBrowserAutomationService,
  ) {}

  validateCredential(payload: string): Promise<BindingProfile> {
    const parsed = this.parseCredential(payload);

    return Promise.resolve({
      xUserId: parsed.xUserId,
      username: parsed.username,
      displayName: parsed.displayName,
      avatarUrl: parsed.avatarUrl,
    });
  }

  fetchRecommendedFeed(payload: string): Promise<RawFeedResponse> {
    const parsed = this.parseCredential(payload);

    return this.xBrowserAutomationService.fetchRecommendedFeed(parsed);
  }

  normalizePosts(raw: RawFeedResponse): Promise<NormalizedPost[]> {
    return Promise.resolve(normalizeRawFeedPosts(raw));
  }

  private parseCredential(payload: string): RealBrowserCredentialPayload {
    if (!payload.trim()) {
      throw new CrawlerAuthError('Credential payload cannot be empty');
    }

    try {
      const parsed = JSON.parse(
        payload,
      ) as Partial<RealBrowserCredentialPayload>;

      if (typeof parsed !== 'object' || parsed === null) {
        throw new CrawlerAuthError('Credential payload must be a JSON object');
      }

      if (parsed.adapter && parsed.adapter !== 'real') {
        throw new CrawlerAuthError(
          'Real crawler credential must declare adapter as real',
        );
      }

      if (!Array.isArray(parsed.cookies) || parsed.cookies.length === 0) {
        throw new CrawlerAuthError(
          'Real crawler credential requires captured browser cookies',
        );
      }

      return {
        adapter: 'real',
        capturedAt:
          typeof parsed.capturedAt === 'string'
            ? parsed.capturedAt
            : new Date().toISOString(),
        loginUrl:
          typeof parsed.loginUrl === 'string'
            ? parsed.loginUrl
            : 'https://x.com/i/flow/login',
        cookies: parsed.cookies,
        authToken:
          typeof parsed.authToken === 'string' ? parsed.authToken : undefined,
        ct0: typeof parsed.ct0 === 'string' ? parsed.ct0 : undefined,
        xUserId:
          typeof parsed.xUserId === 'string' ? parsed.xUserId : undefined,
        username:
          typeof parsed.username === 'string' ? parsed.username : undefined,
        displayName:
          typeof parsed.displayName === 'string'
            ? parsed.displayName
            : undefined,
        avatarUrl:
          typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : undefined,
      };
    } catch (error) {
      if (error instanceof CrawlerAuthError) {
        throw error;
      }

      throw new CrawlerAuthError('Credential payload must be valid JSON');
    }
  }
}
