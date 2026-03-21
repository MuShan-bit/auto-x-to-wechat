import { render, screen } from "@testing-library/react";
import AiPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/lib/request-locale", () => {
  const { getMessages } = jest.requireActual("@/lib/i18n");

  return {
    getRequestMessages: jest.fn(async () => ({
      locale: "zh-CN",
      messages: getMessages("zh-CN"),
    })),
  };
});

jest.mock("./ai-console", () => ({
  AiConsole: ({
    models,
    providers,
    loadError,
  }: {
    loadError?: string | null;
    models: Array<{ displayName: string }>;
    providers: Array<{ name: string }>;
  }) => (
    <div data-testid="ai-console">
      {`providers:${providers.length};models:${models.length};error:${loadError ?? "none"}`}
    </div>
  ),
}));

describe("AiPage", () => {
  it("loads provider and model data for the AI console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockResolvedValueOnce([
        {
          id: "provider-001",
          providerType: "OPENAI",
          name: "OpenAI",
          baseUrl: null,
          enabled: true,
          hasApiKey: true,
          models: [],
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "model-001",
          providerConfigId: "provider-001",
          modelCode: "gpt-5.2",
          displayName: "GPT-5.2 classifier",
          taskType: "POST_CLASSIFY",
          isDefault: true,
          enabled: true,
          parametersJson: {
            temperature: 0.2,
          },
          createdAt: "2026-03-21T00:00:00.000Z",
          updatedAt: "2026-03-21T00:00:00.000Z",
          provider: {
            id: "provider-001",
            providerType: "OPENAI",
            name: "OpenAI",
            baseUrl: null,
            enabled: true,
            hasApiKey: true,
          },
        },
      ]);

    render(await AiPage());

    expect(apiRequestMock).toHaveBeenNthCalledWith(1, {
      path: "/ai/providers?includeDisabled=true",
      method: "GET",
    });
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, {
      path: "/ai/models?includeDisabled=true",
      method: "GET",
    });
    expect(
      screen.getByRole("heading", { name: "AI 模型" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("ai-console")).toHaveTextContent(
      "providers:1;models:1;error:none",
    );
  });

  it("surfaces the load error when AI requests fail", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock
      .mockRejectedValueOnce(new Error("providers failed"))
      .mockResolvedValueOnce([]);

    render(await AiPage());

    expect(screen.getByTestId("ai-console")).toHaveTextContent(
      "providers:0;models:0;error:AI 提供商或模型数据加载失败，请稍后重试。",
    );
  });
});
