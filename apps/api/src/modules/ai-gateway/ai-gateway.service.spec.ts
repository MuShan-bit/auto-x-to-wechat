import {
  AIProviderType,
  AITaskType,
  type AIModelConfig,
  type AIProviderConfig,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import type { PrismaService } from '../prisma/prisma.service';
import { AiGatewayService } from './ai-gateway.service';
import type { AiProviderAdapter } from './ai-gateway.types';

function createProviderRecord(
  cryptoService: CredentialCryptoService,
  overrides: Partial<AIProviderConfig> = {},
): AIProviderConfig {
  return {
    id: 'provider-001',
    userId: 'ai_owner',
    providerType: AIProviderType.OPENAI_COMPATIBLE,
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEncrypted: cryptoService.encrypt('sk-provider-secret'),
    enabled: true,
    createdAt: new Date('2026-03-21T00:00:00.000Z'),
    updatedAt: new Date('2026-03-21T00:00:00.000Z'),
    ...overrides,
  };
}

function createModelRecord(
  provider: AIProviderConfig,
  overrides: Partial<AIModelConfig> = {},
) {
  return {
    id: 'model-001',
    providerConfigId: provider.id,
    modelCode: 'openrouter/auto',
    displayName: 'Classifier',
    taskType: AITaskType.POST_CLASSIFY,
    enabled: true,
    parametersJson: {
      temperature: 0.2,
    },
    createdAt: new Date('2026-03-21T00:05:00.000Z'),
    updatedAt: new Date('2026-03-21T00:05:00.000Z'),
    provider,
    ...overrides,
  };
}

describe('AiGatewayService', () => {
  let service: AiGatewayService;
  let credentialCryptoService: CredentialCryptoService;
  let openAiAdapter: AiProviderAdapter;
  let anthropicAdapter: AiProviderAdapter;
  let geminiAdapter: AiProviderAdapter;
  let prisma: {
    aIModelConfig: {
      findFirst: jest.Mock;
    };
  };

  beforeEach(() => {
    credentialCryptoService = new CredentialCryptoService({
      getOrThrow: jest.fn(() => 'demo-encryption-secret-key-1234'),
    } as unknown as ConfigService);

    openAiAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return providerType === AIProviderType.OPENAI_COMPATIBLE;
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"AI"}',
        finishReason: 'stop',
        usage: {
          inputTokens: 20,
          outputTokens: 10,
          totalTokens: 30,
        },
        rawResponseJson: {
          id: 'chatcmpl-demo',
        },
      }),
    };
    anthropicAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return providerType === AIProviderType.ANTHROPIC;
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"Anthropic"}',
        finishReason: 'end_turn',
        usage: {
          inputTokens: 15,
          outputTokens: 8,
          totalTokens: 23,
        },
        rawResponseJson: {
          id: 'msg-demo',
        },
      }),
    };
    geminiAdapter = {
      supports: jest.fn((providerType: AIProviderType) => {
        return providerType === AIProviderType.GEMINI;
      }),
      generateText: jest.fn().mockResolvedValue({
        text: '{"category":"Gemini"}',
        finishReason: 'STOP',
        usage: {
          inputTokens: 14,
          outputTokens: 6,
          totalTokens: 20,
        },
        rawResponseJson: {
          id: 'gemini-demo',
        },
      }),
    };

    prisma = {
      aIModelConfig: {
        findFirst: jest.fn(),
      },
    };

    service = new AiGatewayService(
      prisma as unknown as PrismaService,
      credentialCryptoService,
      [anthropicAdapter, geminiAdapter, openAiAdapter],
    );
  });

  it('resolves a task model and delegates to the matching provider adapter', async () => {
    const provider = createProviderRecord(credentialCryptoService);
    const model = createModelRecord(provider);
    prisma.aIModelConfig.findFirst.mockResolvedValue(model);

    const result = await service.generateText('ai_owner', {
      taskType: AITaskType.POST_CLASSIFY,
      messages: [
        {
          role: 'system',
          content: 'You are a classifier',
        },
        {
          role: 'user',
          content: 'Categorize this post',
        },
      ],
      responseFormat: 'json_object',
      parameters: {
        max_tokens: 256,
      },
    });

    expect(prisma.aIModelConfig.findFirst).toHaveBeenCalledWith({
      where: {
        taskType: AITaskType.POST_CLASSIFY,
        enabled: true,
        provider: {
          userId: 'ai_owner',
          enabled: true,
        },
      },
      include: {
        provider: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    expect(openAiAdapter.generateText).toHaveBeenCalledWith({
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      baseUrl: 'https://openrouter.ai/api/v1',
      apiKey: 'sk-provider-secret',
      modelCode: 'openrouter/auto',
      messages: [
        {
          role: 'system',
          content: 'You are a classifier',
        },
        {
          role: 'user',
          content: 'Categorize this post',
        },
      ],
      responseFormat: 'json_object',
      timeoutMs: undefined,
      maxAttempts: undefined,
      parameters: {
        temperature: 0.2,
        max_tokens: 256,
      },
    });
    expect(result).toEqual({
      modelConfigId: 'model-001',
      providerConfigId: 'provider-001',
      providerType: AIProviderType.OPENAI_COMPATIBLE,
      modelCode: 'openrouter/auto',
      displayName: 'Classifier',
      text: '{"category":"AI"}',
      finishReason: 'stop',
      usage: {
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
      },
      rawResponseJson: {
        id: 'chatcmpl-demo',
      },
    });
  });

  it('supports explicit model selection and rejects unsupported providers', async () => {
    const provider = createProviderRecord(credentialCryptoService, {
      providerType: AIProviderType.GEMINI,
      baseUrl: null,
    });
    const model = createModelRecord(provider, {
      id: 'model-explicit',
      providerConfigId: 'provider-gemini',
    });
    const anthropicProvider = createProviderRecord(credentialCryptoService, {
      id: 'provider-anthropic',
      providerType: AIProviderType.ANTHROPIC,
      name: 'Claude',
      baseUrl: null,
    });
    const anthropicModel = createModelRecord(anthropicProvider, {
      id: 'model-anthropic',
      providerConfigId: 'provider-anthropic',
      modelCode: 'claude-3-7-sonnet-latest',
      displayName: 'Claude Classifier',
    });
    prisma.aIModelConfig.findFirst
      .mockResolvedValueOnce(model)
      .mockResolvedValueOnce(anthropicModel)
      .mockResolvedValueOnce(null);

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.POST_CLASSIFY,
        modelConfigId: 'model-explicit',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerType: AIProviderType.GEMINI,
        text: '{"category":"Gemini"}',
      }),
    );
    expect(geminiAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: AIProviderType.GEMINI,
        modelCode: 'openrouter/auto',
      }),
    );

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.POST_CLASSIFY,
        modelConfigId: 'model-anthropic',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        providerType: AIProviderType.ANTHROPIC,
        text: '{"category":"Anthropic"}',
      }),
    );
    expect(anthropicAdapter.generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        providerType: AIProviderType.ANTHROPIC,
        modelCode: 'claude-3-7-sonnet-latest',
      }),
    );

    await expect(
      service.generateText('ai_owner', {
        taskType: AITaskType.REPORT_SUMMARY,
        messages: [
          {
            role: 'user',
            content: 'Generate a summary',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
