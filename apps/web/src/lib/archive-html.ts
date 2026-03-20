import sanitizeHtml from "sanitize-html";
import { buildMediaProxyUrl } from "@/lib/media-proxy";

export function sanitizeArchiveHtml(value: string) {
  return sanitizeHtml(value, {
    allowedAttributes: {
      a: ["data-block-link", "data-node-type", "href", "rel", "target"],
      aside: ["data-block-type", "data-relation-type"],
      figure: ["data-block-type", "data-media-type"],
      img: ["alt", "loading", "src"],
      source: ["src", "type"],
      span: ["data-node-type", "data-tag", "data-username"],
      video: [
        "autoplay",
        "controls",
        "crossorigin",
        "loop",
        "muted",
        "playsinline",
        "poster",
        "preload",
        "src",
      ],
    },
    allowedSchemes: ["about", "http", "https"],
    allowedSchemesAppliedToAttributes: ["href", "poster", "src"],
    allowedTags: [
      "a",
      "aside",
      "figure",
      "img",
      "p",
      "source",
      "span",
      "video",
    ],
    transformTags: {
      source: (_tagName, attribs) => ({
        tagName: "source",
        attribs: {
          ...attribs,
          src: attribs.src ? buildMediaProxyUrl(attribs.src) : attribs.src,
        },
      }),
      video: (_tagName, attribs) => ({
        tagName: "video",
        attribs: {
          ...attribs,
          src: attribs.src ? buildMediaProxyUrl(attribs.src) : attribs.src,
        },
      }),
    },
  });
}
