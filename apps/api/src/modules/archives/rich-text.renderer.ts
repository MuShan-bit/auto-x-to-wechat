import {
  type RichTextDocument,
  type RichTextNode,
} from './rich-text.converter';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sanitizeUrl(value: string | undefined) {
  if (!value) {
    return 'about:blank';
  }

  try {
    const url = new URL(value);

    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return escapeHtml(url.toString());
    }
  } catch {
    return 'about:blank';
  }

  return 'about:blank';
}

function renderInlineNode(node: RichTextNode) {
  switch (node.type) {
    case 'text':
      return escapeHtml(node.text);
    case 'mention':
      return `<span data-node-type="mention" data-username="${escapeHtml(node.username)}">${escapeHtml(node.text)}</span>`;
    case 'hashtag':
      return `<span data-node-type="hashtag" data-tag="${escapeHtml(node.tag)}">${escapeHtml(node.text)}</span>`;
    case 'link':
      return `<a data-node-type="link" href="${sanitizeUrl(node.href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(node.text)}</a>`;
  }
}

export function renderRichTextToHtml(document: RichTextDocument) {
  return document.blocks
    .map((block) => {
      if (block.type === 'paragraph') {
        return `<p>${block.children.map((node) => renderInlineNode(node)).join('')}</p>`;
      }

      const sourceUrl = sanitizeUrl(block.sourceUrl);
      const previewUrl = sanitizeUrl(block.previewUrl);

      if (block.mediaType === 'VIDEO') {
        return `<figure data-block-type="media" data-media-type="${block.mediaType}"><video controls preload="metadata" src="${sourceUrl}" poster="${previewUrl}"></video></figure>`;
      }

      return `<figure data-block-type="media" data-media-type="${block.mediaType}"><img src="${sourceUrl}" alt="" loading="lazy" /></figure>`;
    })
    .join('');
}
