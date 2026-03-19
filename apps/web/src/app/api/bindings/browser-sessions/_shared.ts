import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  ApiRequestError,
  apiRequestWithUser,
  getApiErrorMessage,
  type ApiRequestUser,
} from "@/lib/api-client";
import { getRequestMessages } from "@/lib/request-locale";

async function buildUnauthorizedResponse() {
  const { messages } = await getRequestMessages();

  return NextResponse.json({ error: messages.actions.api.unauthorized }, { status: 401 });
}

export async function getAuthenticatedApiUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
  } satisfies ApiRequestUser;
}

export async function proxyApiRequest<T>(
  user: ApiRequestUser,
  input: {
    body?: string;
    method: "GET" | "POST";
    path: string;
  },
) {
  const { messages } = await getRequestMessages();

  try {
    const payload = await apiRequestWithUser<T>(user, input);

    return NextResponse.json(payload);
  } catch (error) {
    const status = error instanceof ApiRequestError ? error.status : 500;

    return NextResponse.json(
      {
        error: getApiErrorMessage(error, messages.actions.api.requestFailed),
      },
      { status },
    );
  }
}

export { buildUnauthorizedResponse };
