import {
  AIProviderType,
  type AIModelConfig,
  type AIProviderConfig,
  type Prisma,
} from '@prisma/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CredentialCryptoService } from '../crypto/credential-crypto.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AI_PROVIDER_ADAPTERS,
  type AiGatewayRequest,
  type AiGatewayResult,
  type AiProviderAdapter,
} from './ai-gateway.types';

type ModelWithProvider = AIModelConfig & {
  provider: AIProviderConfig;
};

@Injectable()
export class AiGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialCryptoService: CredentialCryptoService,
    @Inject(AI_PROVIDER_ADAPTERS)
    private readonly adapters: AiProviderAdapter[],
  ) {}

  async generateText(
    userId: string,
    request: AiGatewayRequest,
  ): Promise<AiGatewayResult> {
    if (request.messages.length === 0) {
      throw new BadRequestException('AI request requires at least one message');
    }

    const model = await this.resolveModel(
      userId,
      request.taskType,
      request.modelConfigId,
    );
    const adapter = this.resolveAdapter(model.provider.providerType);
    const result = await adapter.generateText({
      providerType: model.provider.providerType,
      baseUrl: model.provider.baseUrl,
      apiKey: this.credentialCryptoService.decrypt(
        model.provider.apiKeyEncrypted,
      ),
      modelCode: model.modelCode,
      messages: request.messages,
      responseFormat: request.responseFormat ?? 'text',
      timeoutMs: request.timeoutMs,
      maxAttempts: request.maxAttempts,
      parameters: {
        ...this.normalizeParameters(model.parametersJson),
        ...(request.parameters ?? {}),
      },
    });

    return {
      modelConfigId: model.id,
      providerConfigId: model.providerConfigId,
      providerType: model.provider.providerType,
      modelCode: model.modelCode,
      displayName: model.displayName,
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      rawResponseJson: result.rawResponseJson,
    };
  }

  async testProviderConnection(
    userId: string,
    providerConfigId: string,
    options: {
      modelCode?: string;
      modelConfigId?: string;
      timeoutMs?: number;
    } = {},
  ) {
    const provider = await this.prisma.aIProviderConfig.findFirst({
      where: {
        id: providerConfigId,
        userId,
      },
    });

    if (!provider) {
      throw new NotFoundException('AI provider config not found');
    }

    const model = await this.resolveProviderTestModel(userId, provider.id, {
      modelCode: options.modelCode,
      modelConfigId: options.modelConfigId,
    });
    const adapter = this.resolveAdapter(provider.providerType);
    const result = await adapter.generateText({
      providerType: provider.providerType,
      baseUrl: provider.baseUrl,
      apiKey: this.credentialCryptoService.decrypt(provider.apiKeyEncrypted),
      modelCode: model.modelCode,
      messages: [
        {
          role: 'system',
          content: 'You are a connectivity check assistant.',
        },
        {
          role: 'user',
          content: 'Reply with OK only.',
        },
      ],
      responseFormat: 'text',
      timeoutMs: options.timeoutMs ?? 15_000,
      maxAttempts: 1,
      parameters: {},
    });

    return {
      providerConfigId: provider.id,
      modelConfigId: model.modelConfigId,
      modelCode: model.modelCode,
      providerType: provider.providerType,
      text: result.text,
      finishReason: result.finishReason,
      usage: result.usage,
      rawResponseJson: result.rawResponseJson,
    };
  }

  private async resolveModel(
    userId: string,
    taskType: AiGatewayRequest['taskType'],
    modelConfigId?: string,
  ) {
    const where: Prisma.AIModelConfigWhereInput = modelConfigId
      ? {
          id: modelConfigId,
          enabled: true,
          provider: {
            userId,
            enabled: true,
          },
        }
      : {
          taskType,
          enabled: true,
          provider: {
            userId,
            enabled: true,
          },
        };

    const model = await this.prisma.aIModelConfig.findFirst({
      where,
      include: {
        provider: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    if (!model) {
      throw new NotFoundException(
        modelConfigId
          ? 'AI model config not found or not enabled'
          : `No enabled AI model config found for task type ${taskType}`,
      );
    }

    return model;
  }

  private async resolveProviderTestModel(
    userId: string,
    providerConfigId: string,
    options: {
      modelCode?: string;
      modelConfigId?: string;
    },
  ) {
    if (options.modelConfigId) {
      const model = await this.prisma.aIModelConfig.findFirst({
        where: {
          id: options.modelConfigId,
          providerConfigId,
          provider: {
            userId,
          },
        },
      });

      if (!model) {
        throw new NotFoundException('AI model config not found');
      }

      return {
        modelConfigId: model.id,
        modelCode: model.modelCode,
      };
    }

    if (options.modelCode) {
      return {
        modelConfigId: null,
        modelCode: options.modelCode,
      };
    }

    const model = await this.prisma.aIModelConfig.findFirst({
      where: {
        providerConfigId,
        provider: {
          userId,
        },
      },
      orderBy: [
        { enabled: 'desc' },
        { isDefault: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    if (!model) {
      throw new BadRequestException(
        'Testing a provider requires a model config or model code',
      );
    }

    return {
      modelConfigId: model.id,
      modelCode: model.modelCode,
    };
  }

  private resolveAdapter(providerType: AIProviderType) {
    const adapter = this.adapters.find((item) => item.supports(providerType));

    if (!adapter) {
      throw new BadRequestException(
        `No AI adapter registered for provider type ${providerType}`,
      );
    }

    return adapter;
  }

  private normalizeParameters(value: Prisma.JsonValue | null) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return {};
    }

    return value as Record<string, unknown>;
  }
}
