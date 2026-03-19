import sanitizeHtml from "sanitize-html";

export function sanitizeArchiveHtml(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {
      a: ["data-block-link", "data-node-type", "href", "rel", "target"],
      aside: ["data-block-type", "data-relation-type"],
      figure: ["data-block-type", "data-media-type"],
      img: ["alt", "loading", "src"],
      span: ["data-node-type", "data-tag", "data-username"],
      video: ["controls", "poster", "preload", "src"],
    },
    allowedSchemes: ["about", "http", "https"],
    allowedSchemesAppliedToAttributes: ["href", "poster", "src"],
    allowedTags: ["a", "aside", "figure", "img", "p", "span", "video"],
  });
}
