jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

import { buildApiErrorMessage } from "@/lib/api-client";

describe("api-client", () => {
  it("prefers the detailed message from Nest error payloads", () => {
    expect(
      buildApiErrorMessage(
        400,
        JSON.stringify({
          statusCode: 400,
          error: "Bad Request",
          message: "Testing a provider requires a model config or model code",
        }),
      ),
    ).toBe("Testing a provider requires a model config or model code");
  });

  it("falls back to the generic error field when no message exists", () => {
    expect(
      buildApiErrorMessage(
        400,
        JSON.stringify({
          statusCode: 400,
          error: "Bad Request",
        }),
      ),
    ).toBe("Bad Request");
  });
});
