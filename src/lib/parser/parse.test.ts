import { describe, expect, it } from 'vitest';

import { MAX_INPUT, parse, type ParsedCommand } from './parse';

function ok(input: string): ParsedCommand {
  const result = parse(input);
  if (!result.ok) throw new Error(`expected ok for "${input}", got ${result.error}`);
  return result.command;
}

function fail(input: string): string {
  const result = parse(input);
  if (result.ok) throw new Error(`expected an error for "${input}"`);
  return result.error;
}

describe('parse', () => {
  it('resolves the k alias and splits verb, args, and flags', () => {
    expect(ok('k get pods -n projects')).toEqual({
      program: 'kubectl',
      verb: 'get',
      args: ['pods'],
      flags: { n: 'projects' },
      raw: 'k get pods -n projects',
    });
  });

  it('normalizes long flags and = forms', () => {
    expect(ok('kubectl get pods --namespace=projects').flags).toEqual({ n: 'projects' });
    expect(ok('kubectl get pods --namespace projects').flags).toEqual({ n: 'projects' });
    expect(ok('kubectl get pods -o wide').flags).toEqual({ o: 'wide' });
    expect(ok('kubectl get pods --output=yaml').flags).toEqual({ o: 'yaml' });
    expect(ok('kubectl --help').flags).toEqual({ help: true });
    expect(ok('kubectl get pods -n=projects').flags).toEqual({ n: 'projects' });
  });

  it('keeps unknown flags under their own name and collapses repeated spaces', () => {
    expect(ok('kubectl  get   pods --all-namespaces')).toMatchObject({
      args: ['pods'],
      flags: { 'all-namespaces': true },
    });
    expect(ok('kubectl get pods --selector app=web').flags).toEqual({ selector: 'app=web' });
  });

  it('gives -f a value only when one follows', () => {
    expect(ok('kubectl logs updates -f').flags).toEqual({ f: true });
    expect(ok('kubectl apply -f contact.yaml')).toMatchObject({ args: [], flags: { f: 'contact.yaml' } });
    expect(ok('kubectl logs -f -n updates').flags).toEqual({ f: true, n: 'updates' });
    expect(ok('kubectl logs updates --follow').flags).toEqual({ f: true });
  });

  it('keeps quoted arguments together', () => {
    expect(ok('kubectl describe pod "ask trace"').args).toEqual(['pod', 'ask trace']);
    expect(ok("kubectl describe pod 'ask trace'").args).toEqual(['pod', 'ask trace']);
  });

  it('rejects an unclosed quote', () => {
    expect(fail('kubectl describe pod "ask')).toBe('error: unterminated quoted string');
  });

  it('returns an empty error for blank input', () => {
    expect(fail('')).toBe('');
    expect(fail('   ')).toBe('');
  });

  it('caps input length', () => {
    expect(MAX_INPUT).toBe(200);
    expect(fail(`kubectl get ${'a'.repeat(200)}`)).toBe('error: input is too long (max 200 characters)');
    expect(parse('x'.repeat(200)).ok).toBe(false); // 200 is allowed length-wise; fails as unknown
    expect(fail('x'.repeat(200))).toMatch(/^command not found: x+$/);
  });

  it('accepts kubectl alone', () => {
    expect(ok('kubectl')).toMatchObject({ program: 'kubectl', verb: undefined, args: [], flags: {} });
  });

  it('recognizes clear and help in any case', () => {
    expect(ok('clear').program).toBe('clear');
    expect(ok('HELP ')).toMatchObject({ program: 'help', raw: 'HELP' });
  });

  it('reports unknown programs', () => {
    expect(fail('ls -la')).toBe('command not found: ls');
    expect(fail('<script>alert(1)</script>')).toBe('command not found: <script>alert(1)</script>');
  });

  it('lowercases the program and verb but keeps argument case', () => {
    expect(ok('KUBECTL Describe pod AskTrace')).toMatchObject({
      verb: 'describe',
      args: ['pod', 'AskTrace'],
    });
  });

  it('never throws on unusual input', () => {
    for (const input of [
      'k',
      'k get',
      '--',
      '-',
      'kubectl -n',
      'kubectl get -o',
      'éè \u{1f680}',
      'k\tget\tnodes',
    ]) {
      expect(() => parse(input)).not.toThrow();
    }
    expect(ok('k\tget\tnodes')).toMatchObject({ verb: 'get', args: ['nodes'] });
    expect(ok('kubectl get -o').flags).toEqual({ o: true });
  });
});
