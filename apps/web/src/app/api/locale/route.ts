import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, isLocale, localeCookieName } from "@/lib/i18n";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const requestedLocale = searchParams.get("locale");
  const locale = isLocale(requestedLocale) ? requestedLocale : defaultLocale;
  const redirectTo = searchParams.get("redirectTo");
  const safeRedirectTo =
    typeof redirectTo === "string" && redirectTo.startsWith("/") ? redirectTo : "/";

  const response = NextResponse.redirect(new URL(safeRedirectTo, request.url));

  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
