import { describe, expect, it } from 'vitest';

import { as, exec, texts } from './test-utils';

describe('version', () => {
  it('prints the site version and commit, without cluster data', async () => {
    expect(texts(await exec('kubectl version', { snapshot: undefined }))).toEqual([
      'Client Version: v0.4.0',
      'Build Commit: abc1234',
    ]);
  });
});

describe('cluster-info', () => {
  it('introduces me with real links', async () => {
    const { lines } = as(await exec('kubectl cluster-info', { base: '/pr-preview/pr-9/' }), 'lines');
    expect(lines).toEqual([
      { text: 'Sohan Patil (Software Engineer) is running at Boston, MA', tone: 'ok' },
      { text: 'I build platforms.' },
      { text: 'GitHub is running at https://github.com/roarceus', href: 'https://github.com/roarceus' },
      {
        text: 'LinkedIn is running at https://www.linkedin.com/in/sohan',
        href: 'https://www.linkedin.com/in/sohan',
      },
      { text: 'Email is running at hello@example.com', href: 'mailto:hello@example.com' },
      { text: 'Resume is running at /pr-preview/pr-9/resume.pdf', href: '/pr-preview/pr-9/resume.pdf' },
      { text: "To further debug and diagnose cluster problems, use 'kubectl describe node'.", tone: 'muted' },
    ]);
  });
});

describe('config', () => {
  it('switches to the plain view through the base path', async () => {
    expect(await exec('kubectl config use-context plain', { base: '/pr-preview/pr-9/' })).toEqual({
      kind: 'action',
      action: 'navigate',
      href: '/pr-preview/pr-9/plain/',
      lines: [{ text: 'Switched to context "plain".' }],
    });
  });

  it('stays on the cluster context', async () => {
    expect(texts(await exec('kubectl config use-context cluster'))).toEqual([
      'Switched to context "cluster".',
    ]);
    expect(texts(await exec('kubectl config current-context'))).toEqual(['cluster']);
  });

  it('lists contexts with the current one marked', async () => {
    const table = as(await exec('kubectl config get-contexts'), 'table');
    expect(table.columns.map((column) => column.label)).toEqual(['CURRENT', 'NAME']);
    expect(table.rows).toEqual([
      { current: '*', name: 'cluster' },
      { current: '', name: { text: 'plain', run: 'kubectl config use-context plain' } },
    ]);
  });

  it('rejects unknown contexts and subcommands', async () => {
    expect(await exec('kubectl config use-context plian')).toEqual({
      kind: 'error',
      message: 'error: no context exists with the name: "plian"',
      suggestion: 'kubectl config use-context plain',
    });
    expect(await exec('kubectl config use-context')).toMatchObject({
      message: 'error: no context exists with the name: ""',
    });
    expect(await exec('kubectl config view')).toEqual({
      kind: 'error',
      message: 'error: unknown command "view" for "kubectl config"',
    });
    expect(await exec('kubectl config')).toMatchObject({ suggestion: 'kubectl config get-contexts' });
    expect(texts(await exec('kubectl config use-context cluster', { snapshot: undefined }))).toHaveLength(1);
  });
});

describe('port-forward', () => {
  it('opens GitHub and LinkedIn with a forwarding line', async () => {
    expect(await exec('kubectl port-forward github')).toEqual({
      kind: 'action',
      action: 'open',
      href: 'https://github.com/roarceus',
      lines: [
        { text: 'Forwarding from 127.0.0.1 -> github.com/roarceus', href: 'https://github.com/roarceus' },
      ],
    });
    expect(await exec('kubectl port-forward svc/linkedin')).toMatchObject({
      href: 'https://www.linkedin.com/in/sohan',
    });
  });

  it('says NotFound for anything else', async () => {
    expect(await exec('kubectl port-forward githb')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): services "githb" not found',
      suggestion: 'kubectl port-forward github',
    });
    expect(await exec('kubectl port-forward')).toEqual({
      kind: 'error',
      message: 'error: TYPE/NAME is a required argument for the port-forward command',
      suggestion: 'kubectl port-forward github',
    });
  });
});
