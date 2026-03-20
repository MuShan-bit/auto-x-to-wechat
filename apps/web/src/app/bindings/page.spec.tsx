import { render, screen } from "@testing-library/react";
import BindingsPage from "./page";
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

jest.mock("./binding-console", () => ({
  BindingConsole: ({
    bindings,
  }: {
    bindings: Array<{ username: string; status: string }>;
  }) => (
    <div data-testid="binding-console">
      {bindings.length > 0 ? `${bindings[0].username}:${bindings[0].status}` : "unbound"}
    </div>
  ),
}));

describe("BindingsPage", () => {
  it("loads the binding list and forwards it to the console", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue([
      {
        id: "binding-001",
        xUserId: "x-user-001",
        username: "browser_owner",
        displayName: "Browser Owner",
        avatarUrl: "https://images.example.com/browser-owner.png",
        status: "ACTIVE",
        credentialSource: "WEB_LOGIN",
        crawlEnabled: true,
        crawlIntervalMinutes: 60,
        lastValidatedAt: "2026-03-19T00:00:00.000Z",
        lastCrawledAt: null,
        nextCrawlAt: "2026-03-19T01:00:00.000Z",
        lastErrorMessage: null,
        updatedAt: "2026-03-19T00:00:00.000Z",
        crawlJob: {
          enabled: true,
          intervalMinutes: 60,
          lastRunAt: null,
          nextRunAt: "2026-03-19T01:00:00.000Z",
        },
      },
    ]);

    render(await BindingsPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings",
      method: "GET",
    });
    expect(screen.getByRole("heading", { name: "绑定" })).toBeInTheDocument();
    expect(screen.getByTestId("binding-console")).toHaveTextContent(
      "browser_owner:ACTIVE",
    );
  });

  it("renders an unbound state when the binding list is empty", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue([]);

    render(await BindingsPage());

    expect(apiRequestMock).toHaveBeenCalledWith({
      path: "/bindings",
      method: "GET",
    });
    expect(screen.getByTestId("binding-console")).toHaveTextContent("unbound");
  });
});
