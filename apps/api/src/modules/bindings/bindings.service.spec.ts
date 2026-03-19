import { BindingStatus, CredentialSource, UserRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import { BindingsService } from './bindings.service';

describe('BindingsService', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let bindingsService: BindingsService;
  let credentialCryptoService: CredentialCryptoService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    bindingsService = moduleRef.get(BindingsService);
    credentialCryptoService = moduleRef.get(CredentialCryptoService);

    await prisma.user.upsert({
      where: { id: 'binding_owner' },
      update: {
        email: 'binding_owner@example.com',
        name: 'Binding Owner',
        role: UserRole.USER,
      },
      create: {
        id: 'binding_owner',
        email: 'binding_owner@example.com',
        name: 'Binding Owner',
        role: UserRole.USER,
      },
    });

    await prisma.bindingBrowserSession.deleteMany({
      where: {
        userId: 'binding_owner',
      },
    });
    await prisma.xAccountBinding.deleteMany({
      where: {
        userId: 'binding_owner',
      },
    });
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates a binding directly from browser login payload', async () => {
    const binding = await bindingsService.upsertFromBrowserLogin(
      'binding_owner',
      buildPayload({
        xUserId: 'x-browser-001',
        username: 'browser_owner',
        displayName: 'Browser Owner',
      }),
    );

    expect(binding.userId).toBe('binding_owner');
    expect(binding.status).toBe(BindingStatus.ACTIVE);
    expect(binding.credentialSource).toBe(CredentialSource.WEB_LOGIN);
    expect(binding.crawlEnabled).toBe(true);
    expect(binding.crawlIntervalMinutes).toBe(60);
    expect(binding.crawlJob?.enabled).toBe(true);
    expect(binding.crawlJob?.intervalMinutes).toBe(60);

    const storedPayload = JSON.parse(
      credentialCryptoService.decrypt(binding.authPayloadEncrypted),
    ) as {
      adapter: string;
      username: string;
      xUserId: string;
    };

    expect(storedPayload.adapter).toBe('real');
    expect(storedPayload.username).toBe('browser_owner');
    expect(storedPayload.xUserId).toBe('x-browser-001');
  });

  it('reactivates an existing disabled binding and preserves crawl interval', async () => {
    const existingBinding = await createBinding({
      xUserId: 'x-legacy',
      username: 'legacy_owner',
      displayName: 'Legacy Owner',
      status: BindingStatus.DISABLED,
      crawlEnabled: false,
      crawlIntervalMinutes: 45,
    });

    const rebound = await bindingsService.upsertFromBrowserLogin(
      'binding_owner',
      buildPayload({
        xUserId: 'x-browser-002',
        username: 'rebound_owner',
        displayName: 'Rebound Owner',
        avatarUrl: 'https://images.example.com/rebound-owner.png',
      }),
    );

    expect(rebound.id).toBe(existingBinding.id);
    expect(rebound.status).toBe(BindingStatus.ACTIVE);
    expect(rebound.crawlEnabled).toBe(true);
    expect(rebound.crawlIntervalMinutes).toBe(45);
    expect(rebound.crawlJob?.enabled).toBe(true);
    expect(rebound.crawlJob?.intervalMinutes).toBe(45);
    expect(rebound.username).toBe('rebound_owner');
    expect(rebound.displayName).toBe('Rebound Owner');
  });

  async function createBinding(input: {
    crawlEnabled: boolean;
    crawlIntervalMinutes: number;
    displayName: string;
    status: BindingStatus;
    username: string;
    xUserId: string;
  }) {
    return prisma.xAccountBinding.create({
      data: {
        userId: 'binding_owner',
        xUserId: input.xUserId,
        username: input.username,
        displayName: input.displayName,
        status: input.status,
        credentialSource: CredentialSource.WEB_LOGIN,
        authPayloadEncrypted: credentialCryptoService.encrypt(
          JSON.stringify(buildPayload(input)),
        ),
        lastValidatedAt: new Date('2026-03-19T00:00:00.000Z'),
        crawlEnabled: input.crawlEnabled,
        crawlIntervalMinutes: input.crawlIntervalMinutes,
        nextCrawlAt: input.crawlEnabled
          ? new Date('2026-03-19T12:45:00.000Z')
          : null,
        crawlJob: {
          create: {
            enabled: input.crawlEnabled,
            intervalMinutes: input.crawlIntervalMinutes,
            nextRunAt: input.crawlEnabled
              ? new Date('2026-03-19T12:45:00.000Z')
              : null,
          },
        },
      },
      include: {
        crawlJob: true,
      },
    });
  }

  function buildPayload(input: {
    avatarUrl?: string;
    displayName: string;
    username: string;
    xUserId: string;
  }) {
    return {
      adapter: 'real' as const,
      authToken: 'auth-token-demo',
      avatarUrl:
        input.avatarUrl ?? 'https://images.example.com/browser-owner.png',
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
        {
          domain: '.x.com',
          expires: -1,
          httpOnly: false,
          name: 'ct0',
          path: '/',
          sameSite: 'Lax' as const,
          secure: true,
          value: 'ct0-demo',
        },
      ],
      ct0: 'ct0-demo',
      displayName: input.displayName,
      loginUrl: 'https://x.com/i/flow/login',
      username: input.username,
      xUserId: input.xUserId,
    };
  }
});
