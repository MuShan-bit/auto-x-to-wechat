const MEDIA_PROXY_HOSTS = new Set(["video.twimg.com"]);

export function shouldProxyMediaUrl(value: string | null | undefined) {
  if (typeof value !== "string") {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" && MEDIA_PROXY_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function buildMediaProxyUrl(value: string) {
  if (!shouldProxyMediaUrl(value)) {
    return value;
  }

  return `/api/media-proxy?url=${encodeURIComponent(value)}`;
}
