import { sanitizeArchiveHtml } from "./archive-html";

describe("sanitizeArchiveHtml", () => {
  it("keeps supported archive markup and strips unsafe content", () => {
    const html = sanitizeArchiveHtml(
      '<p>Hello <span data-node-type="mention" data-username="openai">@openai</span></p><script>alert(1)</script><a data-node-type="link" href="javascript:alert(2)" target="_blank" rel="noreferrer noopener">bad link</a><img src="https://images.example.com/post.png" onerror="alert(3)" alt="">',
    );

    expect(html).toBe(
      '<p>Hello <span data-node-type="mention" data-username="openai">@openai</span></p><a data-node-type="link" target="_blank" rel="noreferrer noopener">bad link</a><img src="https://images.example.com/post.png" alt="" />',
    );
  });
});
