import { render, screen } from "@testing-library/react";
import RunDetailPage from "./page";
import { apiRequest } from "@/lib/api-client";

jest.mock("@/lib/api-client", () => ({
  apiRequest: jest.fn(),
  getApiErrorMessage: jest.fn((error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
  ),
  ApiRequestError: class ApiRequestError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
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

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

describe("RunDetailPage", () => {
  it("renders dark-theme-ready action links and detail sections", async () => {
    const apiRequestMock = jest.mocked(apiRequest);

    apiRequestMock.mockResolvedValue({
      id: "run-001",
      triggerType: "MANUAL",
      status: "SUCCESS",
      startedAt: "2026-03-19T08:00:00.000Z",
      finishedAt: "2026-03-19T08:03:00.000Z",
      fetchedCount: 12,
      newCount: 8,
      skippedCount: 4,
      failedCount: 0,
      errorMessage: null,
      errorDetail: null,
      createdAt: "2026-03-19T07:59:00.000Z",
      binding: {
        id: "binding-001",
        username: "browser_owner",
        displayName: "Browser Owner",
        status: "ACTIVE",
      },
      crawlJob: {
        id: "job-001",
        enabled: true,
        intervalMinutes: 30,
        nextRunAt: "2026-03-19T08:30:00.000Z",
      },
      runPosts: [
        {
          id: "run-post-001",
          xPostId: "post-001",
          actionType: "CREATED",
          reason: "Stored successfully.",
          createdAt: "2026-03-19T08:01:00.000Z",
          archivedPost: {
            id: "archive-001",
            authorUsername: "openai",
            postType: "POST",
            postUrl: "https://x.com/openai/status/post-001",
          },
        },
      ],
    });

    render(await RunDetailPage({ params: Promise.resolve({ id: "run-001" }) }));

    expect(screen.getByRole("link", { name: "返回列表" })).toHaveClass(
      "dark:bg-white/8",
    );
    expect(screen.getByRole("link", { name: "查看绑定" })).toHaveClass(
      "dark:bg-[#d8e2db]",
    );
    expect(screen.getByRole("link", { name: "查看归档详情" })).toHaveClass(
      "dark:bg-white/10",
    );
    expect(
      screen
        .getByText("当前没有结构化 `errorDetail` 数据。")
        .closest("div.rounded-3xl"),
    ).toHaveClass("dark:bg-white/8");
  });
});
