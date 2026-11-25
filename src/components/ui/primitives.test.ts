import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';

import Button from './Button.astro';
import Chip from './Chip.astro';
import Expander from './Expander.astro';
import Panel from './Panel.astro';
import { button, chip } from './recipes';
import StatusPill from './StatusPill.astro';
import Table from './Table.astro';
import TagList from './TagList.astro';

type Component = Parameters<AstroContainer['renderToString']>[0];

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

// Type-aware lint can't see the types of `.astro` imports from a `.ts` file, so components come in
// as `unknown` and are narrowed once here.
const render = (
  component: unknown,
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
): Promise<string> => container.renderToString(component as Component, { props, slots });

/** The class attribute of the first element matching `tag`. */
function classOf(html: string, tag: string): string[] {
  return (new RegExp(`<${tag}[^>]*class="([^"]*)"`).exec(html)?.[1] ?? '').split(/\s+/);
}

describe('Button', () => {
  it('renders a link when given an href', async () => {
    const html = await render(Button, { href: '/resume.pdf' }, { default: 'Resume' });
    expect(html).toMatch(/<a[^>]*href="\/resume\.pdf"/);
    expect(html).toContain('Resume');
    expect(html).not.toContain('<button');
  });

  it('renders a type="button" button otherwise', async () => {
    const html = await render(Button, {}, { default: 'Open' });
    expect(html).toMatch(/<button[^>]*type="button"/);
  });

  it('passes submit through', async () => {
    expect(await render(Button, { type: 'submit' }, { default: 'Send' })).toMatch(/type="submit"/);
  });

  it('uses the variant recipe, secondary by default', async () => {
    const primary = await render(Button, { variant: 'primary', href: '#' }, { default: 'Go' });
    expect(classOf(primary, 'a')).toEqual(expect.arrayContaining(button('primary').split(' ')));
    const plain = await render(Button, { href: '#' }, { default: 'Go' });
    expect(classOf(plain, 'a')).toEqual(expect.arrayContaining(button('secondary').split(' ')));
  });

  it('renders an icon slot before the label', async () => {
    const html = await render(Button, { href: '#' }, { default: 'Mail', icon: '<svg id="i"></svg>' });
    expect(html.indexOf('id="i"')).toBeLessThan(html.indexOf('Mail'));
  });
});

describe('Chip', () => {
  it('renders a link with the chip recipe', async () => {
    const html = await render(Chip, { href: '/plain/#projects' }, { default: 'get pods -n projects' });
    expect(html).toMatch(/<a[^>]*href="\/plain\/#projects"/);
    expect(classOf(html, 'a')).toEqual(expect.arrayContaining(chip().split(' ')));
    expect(html).toContain('get pods -n projects');
  });
});

describe('Expander', () => {
  it('renders native details with the summary text and hidden content', async () => {
    const html = await render(Expander, { summary: 'Show 3 more highlights' }, { default: '<p>hidden</p>' });
    expect(html).toMatch(/<details[\s>]/);
    expect(html).toMatch(/<summary[^>]*>[\s\S]*Show 3 more highlights[\s\S]*<\/summary>/);
    expect(html).toContain('<p>hidden</p>');
    expect(html).not.toMatch(/<details[^>]*\sopen/);
  });
});

describe('Panel', () => {
  it('renders a section with a header label and meta', async () => {
    const html = await render(
      Panel,
      { as: 'section', label: 'namespace: career', meta: '3/3 nodes ready' },
      { default: 'body' },
    );
    expect(html).toMatch(/^<section/);
    expect(html).toContain('namespace: career');
    expect(html).toContain('3/3 nodes ready');
    expect(html).toContain('body');
  });

  it('labels the region by its header when asked', async () => {
    const html = await render(Panel, { as: 'section', label: 'Details', labelledBy: 'details-h' });
    expect(html).toMatch(/<section[^>]*aria-labelledby="details-h"/);
    expect(html).toMatch(/id="details-h"[^>]*>\s*Details/);
  });

  it('never points aria-labelledby at a label that is not rendered', async () => {
    const html = await render(Panel, { as: 'section', labelledBy: 'missing' }, { default: 'x' });
    expect(html).not.toContain('aria-labelledby');
  });

  it('is a plain div by default, without an empty header', async () => {
    const html = await render(Panel, {}, { default: 'x' });
    expect(html).toMatch(/^<div/);
    expect(html).not.toContain('<header');
  });
});

describe('Table', () => {
  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];
  const rows = [
    { name: { text: 'mastercontrol', href: '/plain/#experience' }, status: 'Completed' },
    { name: 'capgemini', status: 'Completed' },
  ];

  it('renders a caption and one column header per column, uppercase', async () => {
    const html = await render(Table, { caption: 'Roles', columns, rows });
    expect(html).toMatch(/<caption[^>]*>\s*Roles\s*<\/caption>/);
    expect(html.match(/<th scope="col"/g)).toHaveLength(2);
    expect(classOf(html, 'thead')).toContain('uppercase');
  });

  it('labels every cell for the stacked mobile layout', async () => {
    const html = await render(Table, { caption: 'Roles', columns, rows });
    expect(html.match(/data-label="Name"/g)).toHaveLength(2);
    expect(html.match(/data-label="Status"/g)).toHaveLength(2);
  });

  it('renders link cells as links and text cells as text', async () => {
    const html = await render(Table, { caption: 'Roles', columns, rows });
    expect(html).toMatch(/<a[^>]*href="\/plain\/#experience"[^>]*>\s*mastercontrol\s*<\/a>/);
    expect(html).toMatch(/>\s*capgemini\s*</);
  });

  it('scrolls wide tables inside their own container', async () => {
    const html = await render(Table, { caption: 'Roles', columns, rows });
    expect(classOf(html, 'div')).toContain('overflow-x-auto');
  });
});

describe('StatusPill', () => {
  it.each([
    ['running', 'Running'],
    ['pending', 'Pending'],
    ['failed', 'Failed'],
    ['completed', 'Completed'],
    ['in-progress', 'In progress'],
    ['issued', 'Issued'],
  ])('spells out %s and draws a decorative shape', async (status, word) => {
    const html = await render(StatusPill, { status });
    expect(html).toContain(word);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain(`data-shape=`);
  });

  it('uses a different shape for each of the four phases', async () => {
    const shapes = await Promise.all(
      ['running', 'pending', 'failed', 'completed'].map(async (status) => {
        const html = await render(StatusPill, { status });
        return /data-shape="([^"]+)"/.exec(html)?.[1];
      }),
    );
    expect(new Set(shapes).size).toBe(4);
  });

  it('sits on the soft fill for its status', async () => {
    expect(classOf(await render(StatusPill, { status: 'failed' }), 'span')).toContain(
      'bg-status-failed-soft',
    );
  });

  it('keeps a custom label', async () => {
    expect(await render(StatusPill, { status: 'running', label: 'Open to work' })).toContain('Open to work');
  });
});

describe('TagList', () => {
  it('renders a labelled list of tags', async () => {
    const html = await render(TagList, { items: ['Go', 'Terraform'], label: 'Tech used' });
    expect(html).toMatch(/<ul[^>]*aria-label="Tech used"/);
    expect(html.match(/<li/g)).toHaveLength(2);
  });
});
