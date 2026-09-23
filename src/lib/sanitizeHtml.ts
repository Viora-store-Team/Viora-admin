import DOMPurify from "dompurify";

/** Only the formatting produced by the content editor is allowed. */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return "";
  const safe = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "hr", "a", "div", "span"],
    ALLOWED_ATTR: ["href", "title", "dir", "style"],
    ALLOW_DATA_ATTR: false,
  });
  // Preserve text alignment only, never arbitrary CSS or external CSS URLs.
  const template = document.createElement("template");
  template.innerHTML = safe;
  template.content.querySelectorAll<HTMLElement>("[style]").forEach(node => {
    const alignment = node.style.textAlign;
    node.removeAttribute("style");
    if (["left", "right", "center", "justify", "start", "end"].includes(alignment)) node.style.textAlign = alignment;
  });
  return template.innerHTML;
}
