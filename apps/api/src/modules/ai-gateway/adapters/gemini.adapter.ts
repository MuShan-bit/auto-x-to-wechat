import { AIProviderType } from '@prisma/client';
import { BadGatewayException, Injectable } from '@nestjs/common';
import type {
  AiAdapterRequest,
  AiAdapterResult,
  AiGatewayMessage,
  AiProviderAdapter,
} from '../ai-gateway.types';

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
      role?: string;
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
  usageMetadata?: {
    candidatesTokenCount?: number;
    promptTokenCount?: number;
    totalTokenCount?: number;
  };
};

@Injectable()
export class GeminiAdapter implements AiProviderAdapter {
  supports(providerType: AIProviderType) {
    return providerType === AIProviderType.GEMINI;
  }

  async generateText(request: AiAdapterRequest): Promise<AiAdapterResult> {
    const url = `${this.resolveBaseUrl(request.baseUrl)}/models/${encodeURIComponent(request.modelCode)}:generateContent`;
    const maxAttempts = Math.max(request.maxAttempts ?? 2, 1);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { contents, systemInstruction } = this.normalizeMessages(
          request.messages,
        );
        const generationConfig = {
          ...(request.parameters ?? {}),
          ...(request.responseFormat === 'json_object'
            ? {
                responseMimeType: 'application/json',
              }
            : {}),
        };
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': request.apiKey,
          },
          body: JSON.stringify({
            contents,
            ...(Object.keys(generationConfig).length > 0
              ? {
                  generationConfig,
                }
              : {}),
            ...(systemInstruction
              ? {
                  systemInstruction: {
                    parts: [
                      {
                        text: systemInstruction,
                      },
                    ],
                  },
                }
              : {}),
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

        const payload = (await response.json()) as GeminiResponse;
        const candidate = payload.candidates?.[0];
        const text = this.extractContent(candidate?.content?.parts);

        if (!text) {
          throw new BadGatewayException(
            'Gemini returned an empty completion payload',
          );
        }

        return {
          text,
          finishReason: candidate?.finishReason ?? null,
          usage: {
            inputTokens: payload.usageMetadata?.promptTokenCount ?? null,
            outputTokens: payload.usageMetadata?.candidatesTokenCount ?? null,
            totalTokens: payload.usageMetadata?.totalTokenCount ?? null,
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
        ? `Gemini request failed: ${lastError.message}`
        : 'Gemini request failed',
    );
  }

  private resolveBaseUrl(configuredBaseUrl: string | null) {
    return (
      configuredBaseUrl ?? 'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
  }

  private normalizeMessages(messages: AiGatewayMessage[]) {
    const systemInstruction = messages
      .filter((message) => message.role === 'system')
      .map((message) => message.content.trim())
      .filter((message) => message.length > 0)
      .join('\n\n');

    const contents = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [
          {
            text: message.content,
          },
        ],
      }));

    if (contents.length === 0) {
      contents.push({
        role: 'user',
        parts: [
          {
            text: 'Continue.',
          },
        ],
      });
    }

    return {
      systemInstruction:
        systemInstruction.length > 0 ? systemInstruction : undefined,
      contents,
    };
  }

  private extractContent(
    parts:
      | Array<{
          text?: string;
        }>
      | undefined,
  ) {
    if (!Array.isArray(parts)) {
      return '';
    }

    return parts
      .map((item) => (typeof item.text === 'string' ? item.text : ''))
      .join('')
      .trim();
  }

  private extractErrorMessage(payload: string) {
    if (!payload) {
      return 'Gemini request failed';
    }

    try {
      const parsed = JSON.parse(payload) as GeminiResponse;

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

