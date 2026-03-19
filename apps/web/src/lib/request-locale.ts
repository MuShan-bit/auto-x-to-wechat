import "server-only";

import { cookies } from "next/headers";
import { defaultLocale, getMessages, isLocale, type Locale } from "@/lib/i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("auto-x-to-wechat.locale")?.value;

  if (isLocale(locale)) {
    return locale;
  }

  return defaultLocale;
}

export async function getRequestMessages() {
  const locale = await getRequestLocale();

  return {
    locale,
    messages: getMessages(locale),
  };
}
