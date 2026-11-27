import { describe, expect, it } from 'vitest';

import { ctx } from './fixtures';
import { registry } from './registry';
import { completions } from './run';
import { as, exec } from './test-utils';

const HELP_COMMANDS = [
  'kubectl cluster-info',
  'kubectl get nodes',
  'kubectl get experience',
  'kubectl get pods -n projects',
  'kubectl get pods -n projects -o wide',
  'kubectl top skills',
  'kubectl get certificates',
  'kubectl get achievements',
  'kubectl logs updates -f',
  'kubectl get events',
  'kubectl get all',
  'kubectl port-forward github',
  'kubectl config use-context plain',
  'kubectl version',
  'clear',
];

describe('help', () => {
  it.each(['help', 'kubectl --help', 'kubectl -h', 'kubectl', 'k'])(
    '%s lists every command to click',
    async (input) => {
      const { lines } = as(await exec(input, { snapshot: undefined }), 'lines');
      const runs = lines.map((line) => line.run).filter(Boolean);
      for (const command of HELP_COMMANDS) expect(runs).toContain(command);
    },
  );

  it('uses real names for describe examples when data is loaded', async () => {
    const runs = as(await exec('help'), 'lines').lines.map((line) => line.run);
    expect(runs).toContain('kubectl describe node mastercontrol');
    expect(runs).toContain('kubectl describe pod asktrace');
  });

  it('points describe examples at the lists before data loads', async () => {
    const runs = as(await exec('help', { snapshot: undefined }), 'lines').lines.map((line) => line.run);
    expect(runs).toContain('kubectl get nodes');
    expect(runs).not.toContain('kubectl describe pod asktrace');
  });
});

describe('execute', () => {
  it('names an unknown verb like kubectl, with a suggestion that keeps the arguments', async () => {
    expect(await exec('kubectl gte nodes')).toEqual({
      kind: 'error',
      message: 'error: unknown command "gte" for "kubectl"',
      suggestion: 'kubectl get nodes',
    });
    expect(await exec('kubectl delete pod asktrace')).toEqual({
      kind: 'error',
      message: 'error: unknown command "delete" for "kubectl"',
    });
    expect(await exec('kubectl clear')).toMatchObject({
      message: 'error: unknown command "clear" for "kubectl"',
    });
  });

  it('clears', async () => {
    expect(await exec('clear', { snapshot: undefined })).toEqual({ kind: 'action', action: 'clear' });
  });

  it('cannot reach the server for data commands before the data loads', async () => {
    expect(await exec('kubectl get nodes', { snapshot: undefined })).toEqual({
      kind: 'error',
      message: 'Unable to connect to the server: failed to load cluster data',
    });
  });
});

describe('registry', () => {
  it('marks only read-only verbs for deep links', () => {
    const readOnly = [...registry.values()]
      .filter((command) => command.readOnly)
      .map((command) => command.verb);
    expect(readOnly.sort()).toEqual(['cluster-info', 'describe', 'get', 'help', 'logs', 'top', 'version']);
  });

  it('needs no data for help, clear, version, config, and apply (contact works offline)', () => {
    const offline = [...registry.values()]
      .filter((command) => !command.needsData)
      .map((command) => command.verb);
    expect(offline.sort()).toEqual(['apply', 'clear', 'config', 'help', 'version']);
  });
});

describe('completions', () => {
  const c = ctx();

  it.each([
    ['kub', ['kubectl']],
    ['cl', ['clear']],
    ['kubectl de', ['kubectl describe']],
    ['k get no', ['k get nodes']],
    ['kubectl describe pod as', ['kubectl describe pod asktrace']],
    ['kubectl describe node m', ['kubectl describe node mastercontrol']],
    ['kubectl top s', ['kubectl top skills']],
    ['kubectl logs u', ['kubectl logs updates']],
    ['kubectl config use-context p', ['kubectl config use-context plain']],
    ['kubectl port-forward l', ['kubectl port-forward linkedin']],
    ['kubectl get pods -n p', ['kubectl get pods -n projects']],
    ['kubectl get pods -o w', ['kubectl get pods -o wide']],
    ['kubectl get pods -n projects -o y', ['kubectl get pods -n projects -o yaml']],
    ['kubectl version x', []],
    ['kubectl nope x', []],
    ['', []],
  ])('%j → %j', (input, expected) => {
    expect(completions(input, c)).toEqual(expected);
  });

  it('lists every candidate after a space', () => {
    expect(completions('kubectl top ', c)).toEqual(['kubectl top skills']);
    expect(completions('kubectl describe ', c)).toEqual(['kubectl describe node', 'kubectl describe pod']);
  });

  it('completes names only once data is loaded', () => {
    expect(completions('kubectl describe pod a', ctx({ snapshot: undefined }))).toEqual([]);
  });
});
