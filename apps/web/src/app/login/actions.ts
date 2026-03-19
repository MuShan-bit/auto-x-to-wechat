"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { getAppBaseUrl } from "@/lib/app-url";
import { createSignInSchema } from "@/lib/auth-schema";
import { createDatabaseSession, persistCredentialsAccount } from "@/lib/auth-session";
import { getRequestMessages } from "@/lib/request-locale";
import { prisma } from "@/lib/prisma";

export type LoginFormState = {
  error?: string;
};

function normalizeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.length === 0) {
    return "/dashboard";
  }

  if (value.startsWith("/")) {
    return value;
  }

  try {
    const callbackUrl = new URL(value);
    const appBaseUrl = getAppBaseUrl();
    const appUrl = appBaseUrl ? new URL(appBaseUrl) : null;

    if (appUrl && callbackUrl.origin === appUrl.origin) {
      return `${callbackUrl.pathname}${callbackUrl.search}`;
    }
  } catch {
    return "/dashboard";
  }

  return "/dashboard";
}

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
) {
  const { locale, messages } = await getRequestMessages();
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const signInSchema = createSignInSchema(locale);
  const parsed = signInSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? messages.actions.login.invalidInput,
    } satisfies LoginFormState;
  }

  const callbackUrl = normalizeCallbackUrl(formData.get("callbackUrl"));
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (!user?.passwordHash) {
    return {
      error: messages.actions.login.invalidCredentials,
    } satisfies LoginFormState;
  }

  const isPasswordValid = await compare(parsed.data.password, user.passwordHash);

  if (!isPasswordValid) {
    return {
      error: messages.actions.login.invalidCredentials,
    } satisfies LoginFormState;
  }

  try {
    await persistCredentialsAccount(user.id);
    await createDatabaseSession(user.id);
  } catch (error) {
    if (error instanceof Error) {
      return {
        error: error.message || messages.actions.login.failed,
      } satisfies LoginFormState;
    }

    return {
      error: messages.actions.login.failed,
    } satisfies LoginFormState;
  }

  redirect(callbackUrl);
}
