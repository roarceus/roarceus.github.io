import { describe, expect, it } from 'vitest';

import { readRunParam, runHref } from './deep-link';

describe('readRunParam', () => {
  it.each([
    ['?run=describe+pod+asktrace', 'kubectl describe pod asktrace'],
    ['?run=kubectl+get+nodes+-o+wide', 'kubectl get nodes -o wide'],
    ['?run=k%20top%20skills', 'k top skills'],
    ['?run=help', 'help'],
    ['?run=version', 'kubectl version'],
    ['?run=cluster-info', 'kubectl cluster-info'],
    ['?run=logs+updates', 'kubectl logs updates'],
    ['?foo=1&run=get+all', 'kubectl get all'],
  ])('runs %s as %s', (search, expected) => {
    expect(readRunParam(search)).toBe(expected);
  });

  it.each([
    ['apply', '?run=apply+-f+contact.yaml'],
    ['logs -f at the end', '?run=logs+updates+-f'],
    ['logs -f first', '?run=logs+-f+updates'],
    ['logs --follow', '?run=logs+updates+--follow'],
    ['delete', '?run=delete+pod+x'],
    ['markup', '?run=<script>alert(1)</script>'],
    ['clear', '?run=clear'],
    ['kubectl clear', '?run=kubectl+clear'],
    ['config', '?run=config+use-context+plain'],
    ['port-forward', '?run=port-forward+github'],
    ['a shell command', '?run=rm+-rf+/'],
    ['201 characters', `?run=get+${'x'.repeat(197)}`],
    ['a NUL byte', '?run=get%00nodes'],
    ['a newline', '?run=get%0Anodes'],
    ['an unterminated quote', '?run=get+"nodes'],
    ['a blank value', '?run=+'],
    ['no run', '?foo=1'],
    ['an empty search', ''],
  ])('ignores %s', (_, search) => {
    expect(readRunParam(search)).toBeUndefined();
  });

  it('accepts exactly 200 characters', () => {
    const value = `kubectl get ${'x'.repeat(188)}`;
    expect(value).toHaveLength(200);
    expect(readRunParam(`?run=${encodeURIComponent(value)}`)).toBe(value);
  });
});

describe('runHref', () => {
  it('keeps the base path and encodes the command', () => {
    expect(runHref('kubectl describe pod asktrace', { pathname: '/pr-preview/pr-9/' })).toBe(
      '/pr-preview/pr-9/?run=kubectl+describe+pod+asktrace',
    );
  });

  it('round-trips through readRunParam', () => {
    const input = 'kubectl get pods -n projects -o wide';
    const href = runHref(input, { pathname: '/' });
    expect(readRunParam(href.slice(href.indexOf('?')))).toBe(input);
  });
});

describe('readRunParam (scene commands)', () => {
  it.each([
    'kubectl get pods -n kube-system',
    'kubectl describe pod etcd -n kube-system',
    'kubectl get cs',
    'kubectl describe certificate cka',
    'kubectl describe achievement hackathon-win',
    'kubectl get pods -l skill=terraform -n projects',
  ])('allows %s', (input) => {
    expect(readRunParam(`?${new URLSearchParams({ run: input }).toString()}`)).toBe(input);
  });
});
