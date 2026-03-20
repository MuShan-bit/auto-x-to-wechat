import { NextRequest } from "next/server";
import { shouldProxyMediaUrl } from "@/lib/media-proxy";

const HEADER_WHITELIST = [
  "accept-ranges",
  "cache-control",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
] as const;

function createErrorResponse(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

async function proxyMedia(request: NextRequest, method: "GET" | "HEAD") {
  const upstreamUrl = request.nextUrl.searchParams.get("url");

  if (!upstreamUrl) {
    return createErrorResponse("Missing media url", 400);
  }

  if (!shouldProxyMediaUrl(upstreamUrl)) {
    return createErrorResponse("Unsupported media host", 400);
  }

  const upstreamHeaders = new Headers();
  const range = request.headers.get("range");

  if (range) {
    upstreamHeaders.set("range", range);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers: upstreamHeaders,
    redirect: "follow",
  }).catch(() => null);

  if (!upstreamResponse) {
    return createErrorResponse("Unable to fetch upstream media", 502);
  }

  const responseHeaders = new Headers();

  for (const header of HEADER_WHITELIST) {
    const value = upstreamResponse.headers.get(header);

    if (value) {
      responseHeaders.set(header, value);
    }
  }

  if (!responseHeaders.has("cache-control")) {
    responseHeaders.set("cache-control", "public, max-age=3600");
  }

  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "application/octet-stream");
  }

  return new Response(method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export function GET(request: NextRequest) {
  return proxyMedia(request, "GET");
}

export function HEAD(request: NextRequest) {
  return proxyMedia(request, "HEAD");
}
