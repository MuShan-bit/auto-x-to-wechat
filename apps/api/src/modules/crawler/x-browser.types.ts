import type { ChildProcess } from 'child_process';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { BindingProfile, RawFeedResponse } from './crawler.types';
import type { ResolvedVideoMediaSource } from './x-video-media';

export type XCookiePayload = {
  domain: string;
  expires: number;
  httpOnly: boolean;
  name: string;
  path: string;
  sameSite?: 'Lax' | 'None' | 'Strict';
  secure: boolean;
  value: string;
};

export type RealBrowserCredentialPayload = {
  adapter: 'real';
  authToken?: string;
  avatarUrl?: string;
  capturedAt: string;
  cookies: XCookiePayload[];
  ct0?: string;
  displayName?: string;
  loginUrl: string;
  username?: string;
  xUserId?: string;
};

export type InteractiveLoginRuntime = {
  browser: Browser;
  chromeProcess?: ChildProcess;
  context: BrowserContext;
  page: Page;
  userDataDir?: string;
};

export type InteractiveLoginState =
  | {
      status: 'AUTHENTICATED';
      payload: RealBrowserCredentialPayload;
      profile: BindingProfile;
    }
  | {
      status: 'CLOSED';
    }
  | {
      errorMessage: string;
      status: 'FAILED';
    }
  | {
      status: 'WAITING_LOGIN';
    };

export type AuthenticatedPageSession = {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  profile: BindingProfile;
};

export type XBrowserAutomationPort = {
  closeInteractiveLoginRuntime(runtime: InteractiveLoginRuntime): Promise<void>;
  createAuthenticatedSession(
    payload: RealBrowserCredentialPayload,
  ): Promise<AuthenticatedPageSession>;
  fetchHotFeed(payload: RealBrowserCredentialPayload): Promise<RawFeedResponse>;
  fetchRecommendedFeed(
    payload: RealBrowserCredentialPayload,
  ): Promise<RawFeedResponse>;
  fetchSearchFeed(
    payload: RealBrowserCredentialPayload,
    queryText: string,
  ): Promise<RawFeedResponse>;
  resolvePostVideoMedia(
    payload: RealBrowserCredentialPayload,
    postUrl: string,
    xPostId: string,
  ): Promise<ResolvedVideoMediaSource[]>;
  inspectInteractiveLogin(
    runtime: InteractiveLoginRuntime,
    loginUrl: string,
  ): Promise<InteractiveLoginState>;
  launchInteractiveLogin(loginUrl: string): Promise<InteractiveLoginRuntime>;
  validateCredential(
    payload: RealBrowserCredentialPayload,
  ): Promise<BindingProfile>;
};
