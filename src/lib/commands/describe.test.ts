import { describe, expect, it } from 'vitest';

import { as, exec } from './test-utils';

describe('describe node', () => {
  it('selects the node and prints its roles, highlights, and pods', async () => {
    const result = as(await exec('kubectl describe node mastercontrol'), 'detail');
    expect(result.target).toEqual({ kind: 'node', name: 'mastercontrol' });
    expect(result.lines).toEqual([
      { text: 'Name:         mastercontrol' },
      { text: 'Roles:        work' },
      { text: 'Labels:       org=MasterControl' },
      { text: 'Role:         DevOps Engineer (Co-op)' },
      { text: 'Period:       2025-06 to 2025-12' },
      { text: 'Summary:      Platform work.' },
      { text: 'Tech:         Kubernetes, Probot' },
      { text: 'Highlights:' },
      { text: '  - Shipped a bot.' },
      { text: '  - Cut deploy time.' },
      { text: 'Pods:' },
      { text: '  deployment-gating-bot  Completed', run: 'kubectl describe pod deployment-gating-bot' },
    ]);
  });

  it('accepts no, nodes, and TYPE/NAME', async () => {
    for (const input of [
      'k describe no mastercontrol',
      'kubectl describe nodes mastercontrol',
      'kubectl describe node/mastercontrol',
    ]) {
      expect(as(await exec(input), 'detail').target).toEqual({ kind: 'node', name: 'mastercontrol' });
    }
  });

  it('lists the pods on a shared node', async () => {
    const { lines } = as(await exec('kubectl describe node northeastern', {}), 'detail');
    expect(lines).toContainEqual({ text: '  asktrace  Completed', run: 'kubectl describe pod asktrace' });
  });

  it('says NotFound for an unknown node, with a suggestion', async () => {
    expect(await exec('kubectl describe node mastercontrl')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): nodes "mastercontrl" not found',
      suggestion: 'kubectl describe node mastercontrol',
    });
  });
});

describe('describe pod', () => {
  it('selects the pod and prints its details with links', async () => {
    const result = as(await exec('kubectl describe pod asktrace'), 'detail');
    expect(result.target).toEqual({ kind: 'pod', name: 'asktrace' });
    expect(result.lines).toEqual([
      { text: 'Name:         asktrace' },
      { text: 'Namespace:    projects' },
      { text: 'Node:         northeastern', run: 'kubectl describe node northeastern' },
      { text: 'Status:       Completed' },
      { text: 'Period:       2025-01 to 2025-04' },
      { text: 'Summary:      Course survey insights: Kafka, GKE, and RAG.' },
      { text: 'Tech:         Go, Kafka' },
      {
        text: 'Repo:         https://github.com/trace-survey-analysis',
        href: 'https://github.com/trace-survey-analysis',
      },
      { text: 'Page:         /projects/asktrace/', href: '/projects/asktrace/' },
    ]);
  });

  it('marks an unscheduled pod with no node or period', async () => {
    const { lines } = as(
      await exec('kubectl describe po roarceus-github-io', { base: '/pr-preview/pr-9/' }),
      'detail',
    );
    expect(lines).toContainEqual({ text: 'Node:         <none>' });
    expect(lines).toContainEqual({ text: 'Period:       <unknown>' });
    expect(lines).toContainEqual({
      text: 'Page:         /pr-preview/pr-9/projects/roarceus-github-io/',
      href: '/pr-preview/pr-9/projects/roarceus-github-io/',
    });
  });

  it('says NotFound for an unknown pod, with a suggestion', async () => {
    expect(await exec('kubectl describe pod asktrce')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): pods "asktrce" not found',
      suggestion: 'kubectl describe pod asktrace',
    });
    expect(await exec('kubectl describe pod x')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): pods "x" not found',
    });
  });
});

describe('describe errors', () => {
  it('asks for a type and a name', async () => {
    expect(await exec('kubectl describe')).toEqual({
      kind: 'error',
      message: 'error: you must specify the type of resource to describe',
      suggestion: 'kubectl describe node mastercontrol',
    });
    expect(await exec('kubectl describe pod')).toEqual({
      kind: 'error',
      message: 'error: resource name may not be empty',
      suggestion: 'kubectl get pods -n projects',
    });
  });

  it('names an unknown resource type', async () => {
    expect(await exec('kubectl describe secret x')).toEqual({
      kind: 'error',
      message: 'error: the server doesn\'t have a resource type "secret"',
    });
    expect(await exec('kubectl describe nod x')).toMatchObject({ suggestion: 'kubectl describe node x' });
  });
});
