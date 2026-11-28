import { describe, expect, it } from 'vitest';

import { experienceRows } from '@/lib/content/cluster';
import { kubectlAge } from '@/lib/utils/kubectl';

import { NOW, SNAPSHOT } from './fixtures';
import { as, exec, texts } from './test-utils';

import type { CommandResult } from './types';

const labels = (result: CommandResult) => as(result, 'table').columns.map((column) => column.label);

describe('get nodes', () => {
  it('lists every node as Ready, with role, age, and the site version', async () => {
    const result = await exec('kubectl get nodes');
    const table = as(result, 'table');
    expect(table.caption).toBe('kubectl get nodes');
    expect(labels(result)).toEqual(['NAME', 'STATUS', 'ROLES', 'AGE', 'VERSION']);
    expect(table.rows).toEqual([
      {
        name: { text: 'northeastern', run: 'kubectl describe node northeastern' },
        status: 'Ready',
        roles: 'education',
        age: kubectlAge('2026-01', NOW),
        version: 'v0.4.0',
      },
      {
        name: { text: 'mastercontrol', run: 'kubectl describe node mastercontrol' },
        status: 'Ready',
        roles: 'work',
        age: kubectlAge('2025-06', NOW),
        version: 'v0.4.0',
      },
    ]);
  });

  it('accepts the short names and a single node name', async () => {
    expect(as(await exec('k get no'), 'table').rows).toHaveLength(2);
    expect(as(await exec('kubectl get node mastercontrol'), 'table').rows).toHaveLength(1);
  });

  it('says NotFound for an unknown name, with a suggestion', async () => {
    expect(await exec('kubectl get nodes mastercontrl')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): nodes "mastercontrl" not found',
      suggestion: 'kubectl get nodes mastercontrol',
    });
  });
});

describe('get experience', () => {
  it('matches the experienceRows() table, with short roles and names that describe the node', async () => {
    const result = await exec('kubectl get experience');
    expect(labels(result)).toEqual(['NAME', 'ROLE', 'NODE', 'STATUS', 'AGE']);
    const expected = experienceRows(
      SNAPSHOT.experience.map(({ name, ...data }) => ({ id: name, data })),
      SNAPSHOT.nodes,
      NOW,
    );
    const { rows } = as(result, 'table');
    expect(rows).toEqual(
      expected.map((row) => ({ ...row, name: { text: row.name, run: `kubectl describe node ${row.node}` } })),
    );
    expect(rows[0]?.role).toBe('teaching-assistant');
  });

  it('keeps 120-character names and roles whole, never padding a cell', async () => {
    const long = 'x'.repeat(120);
    const [first] = SNAPSHOT.experience;
    if (!first) throw new Error('fixture');
    const snapshot = { ...SNAPSHOT, experience: [{ ...first, name: long, role: long }] };
    const { rows } = as(await exec('kubectl get experience', { snapshot }), 'table');
    expect(rows).toHaveLength(1);
    for (const cell of Object.values(rows[0] ?? {})) {
      const text = typeof cell === 'string' ? cell : cell.text;
      expect(text.length).toBeLessThanOrEqual(120);
    }
    expect(rows[0]?.role).toBe(long);
  });
});

describe('get pods', () => {
  it('lists projects in the projects namespace', async () => {
    const result = await exec('kubectl get pods -n projects');
    const table = as(result, 'table');
    expect(table.caption).toBe('kubectl get pods -n projects');
    expect(labels(result)).toEqual(['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE']);
    expect(table.rows[0]).toEqual({
      name: { text: 'asktrace', run: 'kubectl describe pod asktrace' },
      ready: '0/1',
      status: 'Completed',
      restarts: '0',
      age: kubectlAge('2025-01', NOW),
    });
    expect(table.rows[1]).toMatchObject({ ready: '1/1', status: 'Running', age: '<unknown>' });
  });

  it('treats get projects as the same table', async () => {
    expect(as(await exec('kubectl get projects'), 'table').rows).toEqual(
      as(await exec('kubectl get pods -n projects'), 'table').rows,
    );
  });

  it('adds NODE and TECH with -o wide', async () => {
    const result = await exec('kubectl get pods -n projects -o wide');
    expect(labels(result)).toEqual(['NAME', 'READY', 'STATUS', 'RESTARTS', 'AGE', 'NODE', 'TECH']);
    const { rows } = as(result, 'table');
    expect(rows[0]).toMatchObject({ node: 'northeastern', tech: 'Go,Kafka' });
    expect(rows[1]).toMatchObject({ node: '<none>' });
  });

  it('finds nothing outside the projects namespace', async () => {
    expect(texts(await exec('kubectl get pods'))).toEqual(['No resources found in default namespace.']);
    expect(texts(await exec('kubectl get pods -n kube-system'))).toEqual([
      'No resources found in kube-system namespace.',
    ]);
  });

  it('prints TYPE/NAME with -o name', async () => {
    expect(texts(await exec('kubectl get projects -o name'))).toEqual([
      'pod/asktrace',
      'pod/roarceus-github-io',
      'pod/deployment-gating-bot',
    ]);
  });
});

describe('get -o yaml', () => {
  it('prints a List of the entries', async () => {
    const { text } = as(await exec('kubectl get pods -n projects -o yaml'), 'yaml');
    expect(text).toMatch(/^apiVersion: v1\nkind: List\nitems:\n- apiVersion: v1\n {2}kind: Pod\n/);
    expect(text).toContain('    name: asktrace\n');
    expect(text).toContain('summary: "Course survey insights: Kafka, GKE, and RAG."');
  });

  it('works for every listed resource', async () => {
    for (const resource of ['nodes', 'experience', 'certificates', 'achievements', 'events']) {
      expect(as(await exec(`kubectl get ${resource} -o yaml`), 'yaml').text).toContain('kind: List');
    }
  });

  it('rejects other output formats like kubectl', async () => {
    expect(await exec('kubectl get nodes -o json')).toEqual({
      kind: 'error',
      message:
        'error: unable to match a printer suitable for the output format "json", allowed formats are: name,wide,yaml',
    });
  });
});

describe('get certificates, achievements, events', () => {
  it('shows CKA and CKAD in progress', async () => {
    const result = await exec('kubectl get certificates');
    expect(labels(result)).toEqual(['NAME', 'ISSUER', 'STATUS', 'DATE']);
    expect(as(result, 'table').rows.slice(0, 2)).toEqual([
      { name: 'CKA', issuer: 'CNCF', status: 'in-progress', date: '<none>' },
      { name: 'CKAD', issuer: 'CNCF', status: 'in-progress', date: '<none>' },
    ]);
  });

  it('lists achievements', async () => {
    const result = await exec('kubectl get achievements');
    expect(labels(result)).toEqual(['NAME', 'ORG', 'DATE']);
    expect(as(result, 'table').rows).toEqual([{ name: 'Hackathon win', org: 'NEU', date: '2025-02' }]);
  });

  it('merges roles, projects, and updates into one timeline, newest first', async () => {
    const result = await exec('kubectl get events');
    expect(labels(result)).toEqual(['LAST SEEN', 'TYPE', 'REASON', 'OBJECT', 'MESSAGE']);
    const { rows } = as(result, 'table');
    expect(rows.map((row) => row.object)).toEqual([
      { text: 'update/stage-3', href: '/updates/stage-3/' },
      { text: 'update/stage-2', href: '/updates/stage-2/' },
      { text: 'node/northeastern', run: 'kubectl describe node northeastern' },
      { text: 'pod/deployment-gating-bot', run: 'kubectl describe pod deployment-gating-bot' },
      { text: 'node/mastercontrol', run: 'kubectl describe node mastercontrol' },
      { text: 'pod/asktrace', run: 'kubectl describe pod asktrace' },
    ]);
    expect(rows[0]).toMatchObject({ 'last-seen': '6d', type: 'Normal', reason: 'Published' });
    expect(rows[2]).toMatchObject({
      reason: 'Scheduled',
      message: 'Teaching Assistant, Network Structures & Cloud Computing (CSYE 6225)',
    });
    expect(rows[3]).toMatchObject({ reason: 'Started', message: 'deployment-gating-bot' });
  });
});

describe('ages from a clock behind the content', () => {
  it('shows 0d instead of failing when a date is after now', async () => {
    const now = new Date('2026-11-19T00:00:00Z');
    const { rows } = as(await exec('kubectl get events', { now }), 'table');
    expect(rows[0]).toMatchObject({ 'last-seen': '0d' });
    expect(
      as(await exec('kubectl get nodes', { now: new Date('2025-01-01T00:00:00Z') }), 'table').rows[0],
    ).toMatchObject({
      age: '0d',
    });
  });
});

describe('get all', () => {
  it('summarizes every resource with counts and the first rows', async () => {
    const { lines } = as(await exec('kubectl get all'), 'lines');
    expect(lines).toContainEqual({ text: 'nodes (2)', run: 'kubectl get nodes' });
    expect(lines).toContainEqual({ text: '  node/northeastern', run: 'kubectl describe node northeastern' });
    expect(lines).toContainEqual({ text: 'pods -n projects (3)', run: 'kubectl get pods -n projects' });
    expect(lines).toContainEqual({ text: 'certificates (3)', run: 'kubectl get certificates' });
    expect(lines).toContainEqual({ text: 'updates (2)', run: 'kubectl logs updates' });
    expect(lines.filter((line) => line.text.startsWith('  pod/'))).toHaveLength(3);
  });

  it('says how many more rows a long section has', async () => {
    const extra = Array.from({ length: 5 }, (_, i) => ({
      id: `c${String(i)}`,
      name: `C${String(i)}`,
      issuer: 'X',
      status: 'issued' as const,
      date: undefined,
    }));
    const snapshot = { ...SNAPSHOT, certifications: [...SNAPSHOT.certifications, ...extra] };
    const { lines } = as(await exec('kubectl get all', { snapshot }), 'lines');
    expect(lines).toContainEqual({ text: '  ... 5 more', run: 'kubectl get certificates', tone: 'muted' });
  });
});

describe('get errors', () => {
  it('asks for a resource type', async () => {
    expect(await exec('kubectl get')).toEqual({
      kind: 'error',
      message: 'error: you must specify the type of resource to get',
      suggestion: 'kubectl get all',
    });
  });

  it('names an unknown resource type, with a suggestion when one is close', async () => {
    expect(await exec('kubectl get nodez')).toEqual({
      kind: 'error',
      message: 'error: the server doesn\'t have a resource type "nodez"',
      suggestion: 'kubectl get nodes',
    });
    expect(await exec('kubectl get secrets')).toEqual({
      kind: 'error',
      message: 'error: the server doesn\'t have a resource type "secrets"',
    });
  });
});
