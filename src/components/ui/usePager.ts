import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

/**
 * Where each page starts, in pixels from the top of the content. A page ends before the first block
 * (a direct child of `content`) that doesn't fit whole, so nothing is cut in half; a block taller
 * than the box is stepped through in whole lines instead (the terminal's one long result).
 */
function pageStarts(box: HTMLElement, content: HTMLElement | null, line: number): number[] {
  const height = box.clientHeight;
  const step = Math.max(line, Math.floor(height / line) * line);
  const blocks = content
    ? [...content.children].map((child) => {
        const el = child as HTMLElement;
        const top = el.offsetTop - content.offsetTop;
        return { top, bottom: top + el.offsetHeight };
      })
    : [];
  const starts = [0];
  for (let start = 0; start + height < box.scrollHeight;) {
    const cut = blocks.find(({ top, bottom }) => top > start && bottom > start + height);
    const next = cut && cut.top <= start + height ? cut.top : start + step;
    starts.push(next);
    start = next;
  }
  return starts;
}

/**
 * Pages a box that must never scroll (ADR 0005: nothing scrolls on the one-screen layout). The box
 * clips its content (overflow hidden) and the pager moves `scrollTop` a page at a time, like `less`.
 * A part of the next page that shows below a page break is clipped, so each page shows whole blocks
 * or whole lines. `resetKey` changing (a new result or item) goes back to page 1; content that grows
 * (streamed lines) adds pages.
 */
export function usePager(
  box: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  active: boolean,
  resetKey: unknown,
) {
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const starts = useRef([0]);
  const current = useRef(0);

  const show = useCallback(
    (index: number) => {
      const el = box.current;
      if (!el) return;
      const top = starts.current[index] ?? 0;
      const end = starts.current[index + 1];
      el.scrollTop = top;
      const hidden = end === undefined ? 0 : el.clientHeight - (end - top);
      el.style.clipPath = hidden > 0 ? `inset(0 0 ${String(hidden)}px 0)` : '';
    },
    [box],
  );

  const measure = useCallback(() => {
    const el = box.current;
    if (!active || !el) {
      starts.current = [0];
      current.current = 0;
      if (el) el.style.clipPath = '';
      setPages(1);
      setPage(0);
      return;
    }
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    starts.current = pageStarts(el, content.current, line);
    setPages(starts.current.length);
    // Layout settles after the first measure (fonts, streamed lines, a resized window): keep the page
    // the reader is on, with its scroll position and clip recomputed for the new layout.
    current.current = Math.min(current.current, starts.current.length - 1);
    setPage(current.current);
    show(current.current);
  }, [box, content, active, show]);

  useEffect(() => {
    // Only a paged box is moved; below the one-screen layout the box scrolls and follows on its own.
    current.current = 0;
    measure();
  }, [measure, resetKey]);

  useEffect(() => {
    const el = content.current;
    if (!active || !el || !box.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(box.current);
    return () => {
      observer.disconnect();
    };
  }, [box, content, active, measure]);

  const go = (next: number) => {
    const target = Math.max(0, Math.min(pages - 1, next));
    current.current = target;
    setPage(target);
    show(target);
  };

  /** Space and Page Down for the next page, Page Up for the previous one, while the box has focus. */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!active || pages < 2) return;
    if (event.key === ' ' || event.key === 'PageDown') {
      event.preventDefault();
      go(page + 1);
    } else if (event.key === 'PageUp') {
      event.preventDefault();
      go(page - 1);
    }
  };

  return {
    page,
    pages,
    next: () => {
      go(page + 1);
    },
    previous: () => {
      go(page - 1);
    },
    onKeyDown,
  };
}
