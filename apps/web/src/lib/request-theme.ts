import "server-only";

import { cookies } from "next/headers";
import { defaultTheme, isThemePreference, type ThemePreference } from "@/lib/theme";

export async function getRequestTheme(): Promise<ThemePreference> {
  const cookieStore = await cookies();
  const theme = cookieStore.get("auto-x-to-wechat.theme")?.value;

  if (isThemePreference(theme)) {
    return theme;
  }

  return defaultTheme;
}
