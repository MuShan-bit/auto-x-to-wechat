import { renderRichTextToHtml } from './rich-text.renderer';

describe('renderRichTextToHtml', () => {
  it('renders rich text paragraphs and media blocks to html', () => {
    const html = renderRichTextToHtml({
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', text: '@alice', username: 'alice' },
            { type: 'text', text: ' ' },
            {
              type: 'link',
              text: 'OpenAI',
              href: 'https://openai.com',
              displayUrl: 'openai.com',
            },
          ],
        },
        {
          type: 'media',
          mediaType: 'IMAGE',
          sourceUrl: 'https://images.example.com/post.png',
          previewUrl: 'https://images.example.com/post-preview.png',
          width: 1200,
          height: 675,
        },
      ],
    });

    expect(html).toBe(
      '<p>Hello <span data-node-type="mention" data-username="alice">@alice</span> <a data-node-type="link" href="https://openai.com/" target="_blank" rel="noreferrer noopener">OpenAI</a></p><figure data-block-type="media" data-media-type="IMAGE"><img src="https://images.example.com/post.png" alt="" loading="lazy" /></figure>',
    );
  });

  it('escapes unsafe text and strips non-http urls', () => {
    const html = renderRichTextToHtml({
      version: 1,
      blocks: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: '<script>alert(1)</script>' },
            {
              type: 'link',
              text: 'bad link',
              href: 'javascript:alert(1)',
            },
          ],
        },
        {
          type: 'media',
          mediaType: 'VIDEO',
          sourceUrl: 'javascript:alert(1)',
          previewUrl: 'https://images.example.com/poster.png',
        },
      ],
    });

    expect(html).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt;<a data-node-type="link" href="about:blank" target="_blank" rel="noreferrer noopener">bad link</a></p><figure data-block-type="media" data-media-type="VIDEO"><video controls preload="metadata" src="about:blank" poster="https://images.example.com/poster.png"></video></figure>',
    );
  });
});
