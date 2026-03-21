import { AIProviderType } from '@prisma/client';
import { BadGatewayException, Injectable } from '@nestjs/common';
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiGatewayMessage,
  AiProviderAdapter,
} from '../ai-gateway.types';

type AnthropicResponse = {
  content?: Array<{
    text?: string;
    type?: string;
  }>;
  error?: {
    message?: string;
  };
  stop_reason?: string | null;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

@Injectable()
export class AnthropicAdapter implements AiProviderAdapter {
  supports(providerType: AIProviderType) {
    return providerType === AIProviderType.ANTHROPIC;
  }

  async generateText(request: AiAdapterRequest): Promise<AiAdapterResult> {
    const url = `${this.resolveBaseUrl(request.baseUrl)}/messages`;
    const maxAttempts = Math.max(request.maxAttempts ?? 2, 1);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { messages, systemInstruction } = this.normalizeMessages(
          request.messages,
          request.responseFormat,
        );
        const parameters = request.parameters ?? {};
        const { max_tokens: _ignoredMaxTokens, ...restParameters } = parameters;
        const maxTokens =
          typeof parameters.max_tokens === 'number' &&
          Number.isFinite(parameters.max_tokens)
            ? parameters.max_tokens
            : 1024;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
            'x-api-key': request.apiKey,
          },
          body: JSON.stringify({
            model: request.modelCode,
            messages,
            ...(systemInstruction
              ? {
                  system: systemInstruction,
                }
              : {}),
            ...restParameters,
            max_tokens: maxTokens,
          }),
          signal: AbortSignal.timeout(request.timeoutMs ?? 30_000),
        });

        if (!response.ok) {
          const errorPayload = await response.text();
          const errorMessage = this.extractErrorMessage(errorPayload);

          if (this.shouldRetry(response.status) && attempt < maxAttempts) {
            lastError = new BadGatewayException(errorMessage);
            continue;
          }

          throw new BadGatewayException(errorMessage);
        }

        const payload = (await response.json()) as AnthropicResponse;
        const text = this.extractContent(payload.content);

        if (!text) {
          throw new BadGatewayException(
            'Anthropic returned an empty completion payload',
          );
        }

        return {
          text,
          finishReason: payload.stop_reason ?? null,
          usage: {
            inputTokens: payload.usage?.input_tokens ?? null,
            outputTokens: payload.usage?.output_tokens ?? null,
            totalTokens:
              payload.usage?.input_tokens !== undefined &&
              payload.usage?.output_tokens !== undefined
                ? payload.usage.input_tokens + payload.usage.output_tokens
                : null,
          },
          rawResponseJson: payload,
        };
      } catch (error) {
        lastError = error;

        if (attempt >= maxAttempts || !this.isRetriableError(error)) {
          break;
        }
      }
    }

    if (lastError instanceof BadGatewayException) {
      throw lastError;
    }

    throw new BadGatewayException(
      lastError instanceof Error
        ? `Anthropic request failed: ${lastError.message}`
        : 'Anthropic request failed',
    );
  }

  private resolveBaseUrl(configuredBaseUrl: string | null) {
    return (configuredBaseUrl ?? 'https://api.anthropic.com/v1').replace(
      /\/+$/,
      '',
    );
  }

  private normalizeMessages(
    messages: AiGatewayMessage[],
    responseFormat?: AiAdapterRequest['responseFormat'],
  ) {
    const systemSegments = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter((message) => message.length > 0);

    if (responseFormat === 'json_object') {
      systemSegments.push('Return only a valid JSON object.');
    }

    const normalizedMessages = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    if (normalizedMessages.length === 0) {
      normalizedMessages.push({
        role: 'user' as const,
        content: 'Continue.',
      });
    }

    return {
      systemInstruction:
        systemSegments.length > 0 ? systemSegments.join('\n\n') : undefined,
      messages: normalizedMessages,
    };
  }

  private extractContent(
    content:
      | Array<{
          text?: string;
          type?: string;
        }>
      | undefined,
  ) {
    if (!Array.isArray(content)) {
      return '';
    }

    return content
      .map((item) => (typeof item.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  private extractErrorMessage(payload: string) {
    if (!payload) {
      return 'Anthropic request failed';
    }

    try {
      const parsed = JSON.parse(payload) as AnthropicResponse;

      if (typeof parsed.error?.message === 'string' && parsed.error.message) {
        return parsed.error.message;
      }
    } catch {
      return payload;
    }

    return payload;
  }

  private shouldRetry(status: number) {
    return status === 408 || status === 429 || status >= 500;
  }

  private isRetriableError(error: unknown) {
    return !(error instanceof BadGatewayException);
  }
}
