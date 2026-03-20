import { MediaType } from '@prisma/client';
import {
  extractResolvedVideoMediaFromGraphqlPayload,
  extractResolvedVideoMediaFromNetworkRequests,
  extractVideoMediaIdentity,
  filterDuplicateVideoPosterImages,
  isEphemeralVideoUrl,
  matchResolvedVideoMedia,
  needsResolvedVideoSource,
} from './x-video-media';

describe('x-video-media helpers', () => {
  it('extracts the best stable video URL from tweet GraphQL payloads', () => {
    const payload = {
      data: {
        tweetResult: {
          result: {
            rest_id: '2034272497789759573',
            legacy: {
              extended_entities: {
                media: [
                  {
                    type: 'video',
                    media_url_https:
                      'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
                    original_info: {
                      w: 1080,
                      h: 1920,
                    },
                    video_info: {
                      variants: [
                        {
                          content_type: 'application/x-mpegURL',
                          url: 'https://video.twimg.com/amplify_video/2034272340201349120/pl/0waZ9FhU3ecgiIiU.m3u8?variant_version=1&tag=21&v=8d2',
                        },
                        {
                          bitrate: 256000,
                          content_type: 'video/mp4',
                          url: 'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/540x960/demo-low.mp4',
                        },
                        {
                          bitrate: 832000,
                          content_type: 'video/mp4',
                          url: 'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    };

    expect(
      extractResolvedVideoMediaFromGraphqlPayload(
        payload,
        '2034272497789759573',
      ),
    ).toEqual([
      {
        sourceUrl:
          'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4',
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        width: 1080,
        height: 1920,
      },
    ]);
  });

  it('prefers direct mp4 network requests over playlists and segments', () => {
    expect(
      extractResolvedVideoMediaFromNetworkRequests([
        'https://video.twimg.com/amplify_video/2034272340201349120/pl/0waZ9FhU3ecgiIiU.m3u8?variant_version=1&tag=21&v=8d2',
        'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/540x960/demo-low.mp4?tag=21',
        'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4?tag=21',
        'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/3000/1080x1920/segment.m4s',
      ]),
    ).toEqual([
      {
        sourceUrl:
          'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4?tag=21',
      },
    ]);
  });

  it('replaces ephemeral video URLs and removes duplicate poster images', () => {
    const mediaItems = [
      {
        mediaType: MediaType.IMAGE,
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        sourceUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
      },
      {
        mediaType: MediaType.VIDEO,
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        sourceUrl: 'blob:https://x.com/demo-video',
      },
    ];

    const repaired = matchResolvedVideoMedia(mediaItems, [
      {
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        sourceUrl:
          'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4',
      },
    ]);

    expect(repaired[1]?.sourceUrl).toContain('video.twimg.com/amplify_video');
    expect(filterDuplicateVideoPosterImages(repaired)).toEqual([
      {
        mediaType: MediaType.VIDEO,
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        sourceUrl:
          'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4',
      },
    ]);
  });

  it('replaces playlist video URLs with direct mp4 variants', () => {
    const repaired = matchResolvedVideoMedia(
      [
        {
          mediaType: MediaType.VIDEO,
          previewUrl:
            'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
          sourceUrl:
            'https://video.twimg.com/amplify_video/2034272340201349120/pl/0waZ9FhU3ecgiIiU.m3u8?variant_version=1&tag=21&v=8d2',
        },
      ],
      [
        {
          previewUrl:
            'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
          sourceUrl:
            'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4?tag=21',
        },
      ],
    );

    expect(repaired).toEqual([
      {
        mediaType: MediaType.VIDEO,
        previewUrl:
          'https://pbs.twimg.com/amplify_video_thumb/2034272340201349120/img/moMDfRVeG4yl0_ue.jpg',
        sourceUrl:
          'https://video.twimg.com/amplify_video/2034272340201349120/vid/avc1/0/0/1080x1920/demo-high.mp4?tag=21',
      },
    ]);
  });

  it('identifies blob video URLs and shared media identities', () => {
    expect(isEphemeralVideoUrl('blob:https://x.com/demo-video')).toBe(true);
    expect(
      isEphemeralVideoUrl('https://video.twimg.com/tweet_video/demo.mp4'),
    ).toBe(false);
    expect(
      extractVideoMediaIdentity(
        'https://pbs.twimg.com/tweet_video_thumb/HDta966aUAE0Vr8.jpg',
      ),
    ).toBe('tweet_video:HDta966aUAE0Vr8');
    expect(
      extractVideoMediaIdentity(
        'https://video.twimg.com/tweet_video/HDta966aUAE0Vr8.mp4',
      ),
    ).toBe('tweet_video:HDta966aUAE0Vr8');
    expect(
      needsResolvedVideoSource(
        'https://video.twimg.com/amplify_video/2034272340201349120/pl/demo.m3u8?tag=21',
      ),
    ).toBe(true);
    expect(
      needsResolvedVideoSource(
        'https://video.twimg.com/tweet_video/HDta966aUAE0Vr8.mp4?tag=21',
      ),
    ).toBe(false);
  });
});
