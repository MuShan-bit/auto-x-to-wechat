import { MediaType, PostType, RelationType } from '@prisma/client';
import type { NormalizedPost } from '../crawler/crawler.types';
import { convertNormalizedPostToRichText } from './rich-text.converter';

describe('convertNormalizedPostToRichText', () => {
  it('converts text, mentions, hashtags, links, paragraphs and media blocks', () => {
    const rawText = 'Hello @alice check #AI https://openai.com\nSecond line';
    const document = convertNormalizedPostToRichText(
      buildNormalizedPost({
        xPostId: 'post-001',
        postUrl: 'https://x.com/demo/status/post-001',
        postType: PostType.POST,
        rawText,
        entities: {
          mentions: [
            {
              username: 'alice',
              start: 6,
              end: 12,
            },
          ],
          hashtags: [
            {
              tag: 'AI',
              start: 19,
              end: 22,
            },
          ],
          urls: [
            {
              url: 'https://openai.com',
              displayUrl: 'openai.com',
              start: 23,
              end: 41,
            },
          ],
        },
        media: [
          {
            mediaType: MediaType.IMAGE,
            sourceUrl: 'https://images.example.com/post-001.png',
            previewUrl: 'https://images.example.com/post-001-preview.png',
            width: 1200,
            height: 675,
          },
        ],
      }),
    );

    expect(document).toEqual({
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', text: '@alice', username: 'alice' },
            { type: 'text', text: ' check ' },
            { type: 'hashtag', text: '#AI', tag: 'AI' },
            { type: 'text', text: ' ' },
            {
              type: 'link',
              text: 'https://openai.com',
              href: 'https://openai.com',
              displayUrl: 'openai.com',
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Second line' }],
        },
        {
          type: 'media',
          mediaType: MediaType.IMAGE,
          sourceUrl: 'https://images.example.com/post-001.png',
          previewUrl: 'https://images.example.com/post-001-preview.png',
          width: 1200,
          height: 675,
        },
      ],
    });
  });

  it('converts explicit post relations into relation blocks', () => {
    const document = convertNormalizedPostToRichText(
      buildNormalizedPost({
        xPostId: 'post-quote-001',
        postUrl: 'https://x.com/demo/status/post-quote-001',
        postType: PostType.QUOTE,
        rawText: 'Commentary on a quoted post',
        relations: [
          {
            relationType: RelationType.QUOTE,
            targetXPostId: 'quoted-001',
            targetUrl: 'https://x.com/openai/status/quoted-001',
            targetAuthorUsername: 'openai',
          },
        ],
      }),
    );

    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Commentary on a quoted post' }],
      },
      {
        type: 'relation',
        relationType: RelationType.QUOTE,
        targetXPostId: 'quoted-001',
        targetUrl: 'https://x.com/openai/status/quoted-001',
        targetAuthorUsername: 'openai',
      },
    ]);
  });

  it('falls back to reply relation summary when relation metadata is absent', () => {
    const document = convertNormalizedPostToRichText(
      buildNormalizedPost({
        xPostId: 'post-reply-001',
        postUrl: 'https://x.com/demo/status/post-reply-001',
        postType: PostType.REPLY,
        rawText: '@alice thanks for sharing',
        entities: {
          mentions: [
            {
              username: 'alice',
              start: 0,
              end: 6,
            },
          ],
          hashtags: [],
          urls: [],
        },
      }),
    );

    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'mention', text: '@alice', username: 'alice' },
          { type: 'text', text: ' thanks for sharing' },
        ],
      },
      {
        type: 'relation',
        relationType: RelationType.REPLY,
        targetAuthorUsername: 'alice',
      },
    ]);
  });

  it('keeps empty lines as empty paragraphs', () => {
    const document = convertNormalizedPostToRichText(
      buildNormalizedPost({
        xPostId: 'post-002',
        postUrl: 'https://x.com/demo/status/post-002',
        postType: PostType.REPLY,
        rawText: 'First line\n\nThird line',
      }),
    );

    expect(document.blocks).toEqual([
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'First line' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Third line' }],
      },
      {
        type: 'relation',
        relationType: RelationType.REPLY,
      },
    ]);
  });
});

function buildNormalizedPost(
  overrides: Partial<NormalizedPost> & {
    postType: PostType;
    postUrl: string;
    rawText: string;
    xPostId: string;
  },
): NormalizedPost {
  return {
    xPostId: overrides.xPostId,
    postUrl: overrides.postUrl,
    postType: overrides.postType,
    author: overrides.author ?? {
      username: 'demo',
    },
    rawText: overrides.rawText,
    sourceCreatedAt:
      overrides.sourceCreatedAt ?? '2026-03-19T11:00:00.000Z',
    entities: overrides.entities ?? {
      mentions: [],
      hashtags: [],
      urls: [],
    },
    media: overrides.media ?? [],
    relations: overrides.relations ?? [],
    language: overrides.language,
    replyCount: overrides.replyCount,
    repostCount: overrides.repostCount,
    quoteCount: overrides.quoteCount,
    favoriteCount: overrides.favoriteCount,
    viewCount: overrides.viewCount,
    rawPayloadJson: overrides.rawPayloadJson ?? {
      id: overrides.xPostId,
    },
  };
}
