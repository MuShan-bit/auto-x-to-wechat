import "server-only";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

type ApiRequestInit = RequestInit & {
  path: string;
};

type ApiErrorPayload = {
  error?: string;
  message?: string | string[];
};

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function buildApiErrorMessage(status: number, payload: string) {
  const message = `API request failed with status ${status}`;

  if (!payload) {
    return message;
  }

  try {
    const parsed = JSON.parse(payload) as ApiErrorPayload;

    if (typeof parsed.error === "string" && parsed.error.length > 0) {
      return parsed.error;
    }

    if (typeof parsed.message === "string" && parsed.message.length > 0) {
      return parsed.message;
    }

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join("；");
    }
  } catch {
    return payload;
  }

  return message;
}

export function getApiErrorMessage(
  error: unknown,
  fallback = "请求失败，请稍后重试。",
) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export async function apiRequest<T>({ path, ...init }: ApiRequestInit): Promise<T> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  }

  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  headers.set("x-internal-auth", process.env.INTERNAL_API_SHARED_SECRET ?? "");
  headers.set("x-user-id", session.user.id);

  if (session.user.email) {
    headers.set("x-user-email", session.user.email);
  }

  if (session.user.role) {
    headers.set("x-user-role", session.user.role);
  }

  const response = await fetch(`${process.env.INTERNAL_API_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new ApiRequestError(
      buildApiErrorMessage(response.status, errorPayload),
      response.status,
    );
  }

  const payload = await response.text();

  if (!payload) {
    return null as T;
  }

  return JSON.parse(payload) as T;
}
