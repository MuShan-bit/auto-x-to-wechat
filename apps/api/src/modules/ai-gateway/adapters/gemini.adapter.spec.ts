import { AIProviderType } from '@prisma/client';
import { BadGatewayException } from '@nestjs/common';
import { GeminiAdapter } from './gemini.adapter';

describe('GeminiAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: GeminiAdapter;

  beforeEach(() => {
    adapter = new GeminiAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends a generateContent request and parses the response', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              role: 'model',
              parts: [
                {
                  text: '{"category":"AI"}',
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 8,
          totalTokenCount: 23,
        },
      }),
    } as Response);

    const result = await adapter.generateText({
      providerType: AIProviderType.GEMINI,
      baseUrl: null,
      apiKey: 'gemini-secret',
      modelCode: 'gemini-2.5-flash',
      responseFormat: 'json_object',
      messages: [
        {
          role: 'system',
          content: 'You are a classifier.',
        },
        {
          role: 'user',
          content: 'Categorize this post.',
        },
        {
          role: 'assistant',
          content: 'Sure, send it.',
        },
      ],
      parameters: {
        temperature: 0.1,
        topP: 0.9,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'content-type': 'application/json',
          'x-goog-api-key': 'gemini-secret',
        }),
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: 'Categorize this post.',
                },
              ],
            },
            {
              role: 'model',
              parts: [
                {
                  text: 'Sure, send it.',
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topP: 0.9,
            responseMimeType: 'application/json',
          },
          systemInstruction: {
            parts: [
              {
                text: 'You are a classifier.',
              },
            ],
          },
        }),
      }),
    );
    expect(result).toEqual({
      text: '{"category":"AI"}',
      finishReason: 'STOP',
      usage: {
        inputTokens: 15,
        outputTokens: 8,
        totalTokens: 23,
      },
      rawResponseJson: {
        candidates: [
          {
            finishReason: 'STOP',
            content: {
              role: 'model',
              parts: [
                {
                  text: '{"category":"AI"}',
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 8,
          totalTokenCount: 23,
        },
      },
    });
  });

  it('retries retriable errors and fails for non-retriable responses', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        text: async () => 'service unavailable',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: 'retry success',
                  },
                ],
              },
            },
          ],
        }),
      } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.GEMINI,
        baseUrl: null,
        apiKey: 'gemini-secret',
        modelCode: 'gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
        maxAttempts: 2,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        text: 'retry success',
      }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () =>
        JSON.stringify({
          error: {
            message: 'bad request',
          },
        }),
    } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.GEMINI,
        baseUrl: null,
        apiKey: 'gemini-secret',
        modelCode: 'gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: 'Ping',
          },
        ],
        maxAttempts: 2,
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
});

