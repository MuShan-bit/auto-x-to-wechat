import type { MediaType } from '@prisma/client';

type UnknownRecord = Record<string, unknown>;

export type ResolvedVideoMediaSource = {
  height?: number;
  previewUrl?: string;
  sourceUrl: string;
  width?: number;
};

type MediaLike = {
  height?: number | null;
  mediaType: MediaType | string;
  previewUrl?: string | null;
  sourceUrl: string;
  width?: number | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function normalizeUrl(value?: string | null) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith('//')) {
    return `https:${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return `https://x.com${normalized}`;
  }

  return normalized;
}

function extractDirectMediaArrays(candidate: UnknownRecord) {
  const arrays: unknown[][] = [];
  const legacy = isRecord(candidate.legacy) ? candidate.legacy : null;

  if (!legacy) {
    return arrays;
  }

  const extendedEntities = isRecord(legacy.extended_entities)
    ? legacy.extended_entities
    : null;

  if (extendedEntities && Array.isArray(extendedEntities.media)) {
    arrays.push(extendedEntities.media);
  }

  const entities = isRecord(legacy.entities) ? legacy.entities : null;

  if (entities && Array.isArray(entities.media)) {
    arrays.push(entities.media);
  }

  return arrays;
}

function selectBestVideoVariant(variants: unknown[]) {
  const candidates = variants
    .flatMap((item) => {
      if (!isRecord(item) || typeof item.url !== "string") {
        return [];
      }

      const sourceUrl = normalizeUrl(item.url);

      if (!sourceUrl) {
        return [];
      }

      return [
        {
          bitrate:
            typeof item.bitrate === "number" && Number.isFinite(item.bitrate)
              ? item.bitrate
              : 0,
          contentType:
            typeof item.content_type === "string" ? item.content_type : "",
          sourceUrl,
        },
      ];
    })
    .filter((item) => !item.sourceUrl.endsWith(".m4s"));

  const mp4Variants = candidates
    .filter((item) => item.contentType === "video/mp4")
    .sort((left, right) => right.bitrate - left.bitrate);

  if (mp4Variants[0]) {
    return mp4Variants[0].sourceUrl;
  }

  return candidates.find((item) =>
    item.contentType.includes("mpegURL"),
  )?.sourceUrl;
}

export function isEphemeralVideoUrl(value?: string | null) {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim();

  return normalized.startsWith("blob:") || normalized === "about:blank";
}

export function extractVideoMediaIdentity(value?: string | null) {
  const normalized = normalizeUrl(value);

  if (!normalized) {
    return null;
  }

  const patterns = [
    /pbs\.twimg\.com\/(amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)\/([^/.?]+)/i,
    /video\.twimg\.com\/(amplify_video|ext_tw_video|tweet_video)\/([^/.?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (!match) {
      continue;
    }

    const kind = match[1].replace("_thumb", "");
    const id = match[2];

    return `${kind}:${id}`;
  }

  return null;
}

export function extractResolvedVideoMediaFromGraphqlPayload(
  payload: unknown,
  xPostId: string,
): ResolvedVideoMediaSource[] {
  const seenObjects = new Set<unknown>();
  const candidates: UnknownRecord[] = [];

  const visit = (value: unknown) => {
    if (!isRecord(value) && !Array.isArray(value)) {
      return;
    }

    if (seenObjects.has(value)) {
      return;
    }

    seenObjects.add(value);

    if (Array.isArray(value)) {
      for (const item of value) {
        visit(item);
      }

      return;
    }

    if (value.rest_id === xPostId) {
      candidates.push(value);
    }

    for (const nestedValue of Object.values(value)) {
      visit(nestedValue);
    }
  };

  visit(payload);

  const resolvedMedia = new Map<string, ResolvedVideoMediaSource>();

  for (const candidate of candidates) {
    for (const mediaArray of extractDirectMediaArrays(candidate)) {
      for (const mediaItem of mediaArray) {
        if (!isRecord(mediaItem)) {
          continue;
        }

        const mediaType =
          typeof mediaItem.type === "string" ? mediaItem.type : "";

        if (mediaType !== "video" && mediaType !== "animated_gif") {
          continue;
        }

        const videoInfo = isRecord(mediaItem.video_info)
          ? mediaItem.video_info
          : null;
        const sourceUrl =
          videoInfo && Array.isArray(videoInfo.variants)
            ? selectBestVideoVariant(videoInfo.variants)
            : undefined;

        if (!sourceUrl) {
          continue;
        }

        const previewUrl =
          normalizeUrl(
            typeof mediaItem.media_url_https === "string"
              ? mediaItem.media_url_https
              : typeof mediaItem.media_url === "string"
                ? mediaItem.media_url
                : undefined,
          ) ?? undefined;
        const originalInfo = isRecord(mediaItem.original_info)
          ? mediaItem.original_info
          : null;
        const width =
          originalInfo && typeof originalInfo.w === "number"
            ? originalInfo.w
            : undefined;
        const height =
          originalInfo && typeof originalInfo.h === "number"
            ? originalInfo.h
            : undefined;
        const identity =
          extractVideoMediaIdentity(previewUrl) ??
          extractVideoMediaIdentity(sourceUrl) ??
          sourceUrl;

        if (!resolvedMedia.has(identity)) {
          resolvedMedia.set(identity, {
            sourceUrl,
            previewUrl,
            width,
            height,
          });
        }
      }
    }
  }

  return Array.from(resolvedMedia.values());
}

function getNetworkRequestScore(url: string) {
  const normalized = normalizeUrl(url) ?? url;
  const resolutionMatch = normalized.match(/\/(\d+)x(\d+)\//);
  const resolutionScore = resolutionMatch
    ? Number(resolutionMatch[1]) * Number(resolutionMatch[2])
    : 0;

  if (normalized.endsWith(".mp4")) {
    return 20_000_000 + resolutionScore;
  }

  if (normalized.includes(".m3u8")) {
    return 10_000_000 + resolutionScore;
  }

  return resolutionScore;
}

export function extractResolvedVideoMediaFromNetworkRequests(
  requestUrls: string[],
): ResolvedVideoMediaSource[] {
  const resolvedMedia = new Map<
    string,
    {
      score: number;
      sourceUrl: string;
    }
  >();

  for (const requestUrl of requestUrls) {
    const sourceUrl = normalizeUrl(requestUrl);

    if (!sourceUrl || sourceUrl.endsWith(".m4s")) {
      continue;
    }

    const identity = extractVideoMediaIdentity(sourceUrl);

    if (!identity) {
      continue;
    }

    const score = getNetworkRequestScore(sourceUrl);
    const current = resolvedMedia.get(identity);

    if (!current || score > current.score) {
      resolvedMedia.set(identity, {
        score,
        sourceUrl,
      });
    }
  }

  return Array.from(resolvedMedia.values()).map((item) => ({
    sourceUrl: item.sourceUrl,
  }));
}

export function filterDuplicateVideoPosterImages<T extends MediaLike>(
  mediaItems: T[],
) {
  const videoPosterIdentities = new Set(
    mediaItems
      .filter((item) => item.mediaType === "VIDEO")
      .map((item) => extractVideoMediaIdentity(item.previewUrl))
      .filter((item): item is string => item !== null),
  );

  return mediaItems.filter((item) => {
    if (item.mediaType !== "IMAGE") {
      return true;
    }

    const identity = extractVideoMediaIdentity(item.sourceUrl);

    return !identity || !videoPosterIdentities.has(identity);
  });
}

export function matchResolvedVideoMedia<T extends MediaLike>(
  mediaItems: T[],
  resolvedMedia: ResolvedVideoMediaSource[],
) {
  if (resolvedMedia.length === 0) {
    return mediaItems;
  }

  const resolvedByIdentity = new Map<string, ResolvedVideoMediaSource>();
  const fallbackQueue: ResolvedVideoMediaSource[] = [];

  for (const item of resolvedMedia) {
    const identity =
      extractVideoMediaIdentity(item.previewUrl) ??
      extractVideoMediaIdentity(item.sourceUrl);

    if (identity && !resolvedByIdentity.has(identity)) {
      resolvedByIdentity.set(identity, item);
      continue;
    }

    fallbackQueue.push(item);
  }

  return mediaItems.map((item) => {
    if (item.mediaType !== "VIDEO" || !isEphemeralVideoUrl(item.sourceUrl)) {
      return item;
    }

    const identity =
      extractVideoMediaIdentity(item.previewUrl) ??
      extractVideoMediaIdentity(item.sourceUrl);
    const resolvedItem = identity
      ? resolvedByIdentity.get(identity)
      : undefined;
    const fallbackItem =
      resolvedItem ?? (fallbackQueue.length > 0 ? fallbackQueue.shift() : null);

    if (!fallbackItem) {
      return item;
    }

    return {
      ...item,
      sourceUrl: fallbackItem.sourceUrl,
      previewUrl: fallbackItem.previewUrl ?? item.previewUrl,
      width: fallbackItem.width ?? item.width,
      height: fallbackItem.height ?? item.height,
    };
  });
}
