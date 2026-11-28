/**
 * A Markdown body as plain-text lines (design doc stage-4 §7): paragraphs joined onto one line, each list
 * item its own `- ` line, and headings, emphasis, code, and links reduced to their text. The scene's
 * Secret shows these as React text, so no markup ever reaches the page.
 */

const LIST_ITEM = /^\s*(?:[-*+]|\d+[.)])\s+/;
// A fenced code block, closed or running to the end: code isn't part of the story.
const FENCE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^[ \t]*\1[ \t]*$|(?![\s\S]))/gm;
const IMAGE = /!\[[^\]]*\]\([^)]*\)/g;
const LINK = /\[([^\]]*)\]\([^)]*\)/g;
const HTML_TAG = /<[^>]+>/g;
const CODE = /`([^`]*)`/g;
// Emphasis markers at word edges only, so `snake_case` keeps its underscores.
const EMPHASIS = /(^|[\s(])([*_]{1,3})(\S(?:.*?\S)?)\2(?=[\s.,;:!?)]|$)/g;

function inline(text: string): string {
  return (
    text
      .replace(IMAGE, '')
      .replace(LINK, '$1')
      .replace(HTML_TAG, '')
      // One pass can leave a tag behind (`<<b>b>`); text never needs angle brackets, so none survive.
      .replace(/[<>]/g, '')
      .replace(CODE, '$1')
      .replace(EMPHASIS, '$1$3')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function plainParagraphs(markdown: string | undefined): string[] {
  if (markdown === undefined) return [];
  const lines: string[] = [];
  for (const block of markdown.replace(FENCE, '').split(/\n\s*\n/)) {
    let paragraph: string[] = [];
    const flush = () => {
      const text = inline(paragraph.join(' '));
      if (text !== '') lines.push(text);
      paragraph = [];
    };
    for (const raw of block.split('\n')) {
      if (LIST_ITEM.test(raw)) {
        flush();
        const item = inline(raw.replace(LIST_ITEM, ''));
        if (item !== '') lines.push(`- ${item}`);
      } else {
        paragraph.push(raw.replace(/^\s*#{1,6}\s+/, ''));
      }
    }
    flush();
  }
  return lines;
}
