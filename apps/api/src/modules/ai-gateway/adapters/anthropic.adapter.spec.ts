import { AIProviderType } from '@prisma/client';
import { BadGatewayException } from '@nestjs/common';
import { AnthropicAdapter } from './anthropic.adapter';

describe('AnthropicAdapter', () => {
  const originalFetch = global.fetch;
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    adapter = new AnthropicAdapter();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends a native messages request and parses the text response', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: '{"category":"AI"}',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 18,
          output_tokens: 7,
        },
      }),
    } as Response);

    const result = await adapter.generateText({
      providerType: AIProviderType.ANTHROPIC,
      baseUrl: null,
      apiKey: 'anthropic-secret',
      modelCode: 'claude-3-7-sonnet-latest',
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
      ],
      parameters: {
        temperature: 0.2,
        max_tokens: 400,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'x-api-key': 'anthropic-secret',
        }),
      }),
    );
    expect(
      JSON.parse(
        String((fetchMock.mock.calls[0]?.[1] as { body?: string }).body),
      ),
    ).toEqual({
      model: 'claude-3-7-sonnet-latest',
      messages: [
        {
          role: 'user',
          content: 'Categorize this post.',
        },
      ],
      system: 'You are a classifier.\n\nReturn only a valid JSON object.',
      temperature: 0.2,
      max_tokens: 400,
    });
    expect(result).toEqual({
      text: '{"category":"AI"}',
      finishReason: 'end_turn',
      usage: {
        inputTokens: 18,
        outputTokens: 7,
        totalTokens: 25,
      },
      rawResponseJson: {
        content: [
          {
            type: 'text',
            text: '{"category":"AI"}',
          },
        ],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 18,
          output_tokens: 7,
        },
      },
    });
  });

  it('retries retriable errors and fails for non-retriable errors', async () => {
    const fetchMock = jest.mocked(global.fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 529,
        text: async () => 'overloaded',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [
            {
              type: 'text',
              text: 'retry success',
            },
          ],
        }),
      } as Response);

    await expect(
      adapter.generateText({
        providerType: AIProviderType.ANTHROPIC,
        baseUrl: null,
        apiKey: 'anthropic-secret',
        modelCode: 'claude-3-7-sonnet-latest',
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
        providerType: AIProviderType.ANTHROPIC,
        baseUrl: null,
        apiKey: 'anthropic-secret',
        modelCode: 'claude-3-7-sonnet-latest',
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
