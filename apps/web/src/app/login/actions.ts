"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { signInSchema } from "@/lib/auth-schema";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _previousState: LoginFormState,
  formData: FormData,
) {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = signInSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "登录信息格式不正确",
    } satisfies LoginFormState;
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        error: "邮箱或密码错误，请检查后重试。",
      } satisfies LoginFormState;
    }

    throw error;
  }

  return {};
}
