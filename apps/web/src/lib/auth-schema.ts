import { z } from "zod";
import type { Locale } from "@/lib/i18n";
import { getMessages } from "@/lib/i18n";

export function createSignInSchema(locale: Locale) {
  const messages = getMessages(locale);

  return z.object({
    email: z.string().trim().email(messages.actions.login.invalidEmail),
    password: z.string().min(8, messages.actions.login.invalidPassword),
  });
}

export const signInSchema = createSignInSchema("zh-CN");

export type SignInInput = z.infer<typeof signInSchema>;
