import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';

/**
 * Pages a box that must never scroll (ADR 0005: nothing scrolls on the one-screen layout). The box
 * clips its content (overflow hidden) and the pager moves `scrollTop` a page at a time, like `less`.
 * A page is a whole number of lines, so a row is never cut in half. `resetKey` changing (a new
 * result) goes back to page 1; content that grows (streamed lines) adds pages.
 */
export function usePager(
  box: RefObject<HTMLElement | null>,
  content: RefObject<HTMLElement | null>,
  active: boolean,
  resetKey: unknown,
) {
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const pageHeight = useRef(0);

  const measure = useCallback(() => {
    const el = box.current;
    if (!active || !el) {
      setPages(1);
      return;
    }
    const line = Number.parseFloat(getComputedStyle(el).lineHeight) || 20;
    pageHeight.current = Math.max(line, Math.floor(el.clientHeight / line) * line);
    setPages(Math.max(1, Math.ceil(el.scrollHeight / pageHeight.current)));
  }, [box, active]);

  useEffect(() => {
    // Only a paged box is moved; below the one-screen layout the box scrolls and follows on its own.
    if (active && box.current) box.current.scrollTop = 0;
    setPage(0);
    measure();
  }, [box, active, measure, resetKey]);

  useEffect(() => {
    const el = content.current;
    if (!active || !el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, [content, active, measure]);

  const go = (next: number) => {
    const target = Math.max(0, Math.min(pages - 1, next));
    setPage(target);
    if (box.current) box.current.scrollTop = target * pageHeight.current;
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
