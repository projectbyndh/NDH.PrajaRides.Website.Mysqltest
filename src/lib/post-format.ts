// Shared by the post editor (browser) and pages: post kinds, validation and the tiny text format.

export type PostKind = "news" | "offer" | "blog";
export const POST_KINDS: { value: PostKind; label: string }[] = [
  { value: "news", label: "News" },
  { value: "offer", label: "Offer" },
  { value: "blog", label: "Blog" },
];

/** Where a published post lives on the website: blog articles under /blog, the rest under /news. */
export const postHref = (p: { kind: PostKind; slug: string }) => (p.kind === "blog" ? `/blog/${p.slug}` : `/news/${p.slug}`);

export function postFieldError(field: string, value: string): string | null {
  const v = value.trim();
  switch (field) {
    case "title":
      if (v.length < 5) return "Write a title (at least 5 characters).";
      return v.length <= 120 ? null : "Keep the title under 120 characters.";
    case "excerpt":
      if (v.length < 10) return "Write a short summary (at least 10 characters).";
      return v.length <= 260 ? null : "Keep the summary under 260 characters.";
    case "body":
      return v.length <= 12000 ? null : "Keep the article under 12,000 characters.";
    case "endsOn":
      return !v || /^\d{4}-\d{2}-\d{2}$/.test(v) ? null : "Pick a valid date.";
    case "kind":
      return POST_KINDS.some((k) => k.value === v) ? null : "Pick news, offer or blog.";
    default:
      return null;
  }
}

/**
 * Article text → blocks. Blank lines separate paragraphs; a line starting with "## " is a
 * heading; lines starting with "- " form a bullet list. Everything is rendered as plain text.
 */
export type Block = { type: "p"; text: string } | { type: "h"; text: string } | { type: "ul"; items: string[] };

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of body.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    let para: string[] = [];
    const flush = () => {
      if (para.length) blocks.push({ type: "p", text: para.join(" ") });
      para = [];
    };
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flush();
        blocks.push({ type: "h", text: line.slice(3) });
      } else if (line.startsWith("- ")) {
        flush();
        const last = blocks[blocks.length - 1];
        if (last?.type === "ul") last.items.push(line.slice(2));
        else blocks.push({ type: "ul", items: [line.slice(2)] });
      } else para.push(line);
    }
    flush();
  }
  return blocks;
}

/** An offer whose last day has passed (Nepal time). */
export function isExpired(endsOn: string | null, today: string): boolean {
  return !!endsOn && endsOn < today;
}
