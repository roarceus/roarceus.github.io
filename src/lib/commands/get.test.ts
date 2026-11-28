import { describe, expect, it } from 'vitest';

import { experienceRows } from '@/lib/content/cluster';
import { kubectlAge } from '@/lib/utils/kubectl';

import { NOW, SNAPSHOT } from './fixtures';
import { as, exec, texts } from './test-utils';

import type { CommandResult } from './types';

const labels = (result: CommandResult) => as(result, 'table').columns.map((column) => column.label);

describe('get nodes', () => {
  it('shows cordoned eras as SchedulingDisabled, aged from their school or projects', async () => {
    const snapshot = {
      ...SNAPSHOT,
      nodes: [
        ...SNAPSHOT.nodes,
        {
          name: 'personal',
          label: 'Personal projects',
          role: 'personal' as const,
          cordoned: false,
          pods: [{ slug: 'side', name: 'side', phase: 'Running' as const }],
        },
        {
          name: 'mumbai',
          label: 'University of Mumbai',
          role: 'education' as const,
          cordoned: true,
          pods: [],
        },
      ],
      education: [
        ...SNAPSHOT.education,
        {
          name: 'mumbai',
          school: 'University of Mumbai',
          degree: 'BE',
          field: 'CE',
          node: 'mumbai',
          start: '2016-08',
          end: '2020-10',
          highlights: [],
        },
      ],
      projects: [
        ...SNAPSHOT.projects,
        {
          slug: 'side',
          name: 'side',
          summary: 'A side project.',
          phase: 'Running' as const,
          node: 'personal',
          tech: ['Go'],
          start: '2026-01',
          end: undefined,
          repo: undefined,
          demo: undefined,
          story: [],
        },
      ],
    };
    const { rows } = as(await exec('kubectl get nodes', { snapshot }), 'table');
    expect(rows.at(-2)).toMatchObject({ status: 'Ready', roles: 'personal', age: '329d' });
    expect(rows.at(-1)).toMatchObject({ status: 'Ready,SchedulingDisabled', roles: 'education', age: '10y' });
  });

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
        // As old as its oldest declarer: the degree (2024-01), not the TA role.
        age: kubectlAge('2024-01', NOW),
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

  it('finds nothing outside the projects and kube-system namespaces', async () => {
    expect(texts(await exec('kubectl get pods'))).toEqual(['No resources found in default namespace.']);
    expect(texts(await exec('kubectl get pods -n kube-public'))).toEqual([
      'No resources found in kube-public namespace.',
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
    expect(
      as(result, 'table')
        .rows.slice(0, 2)
        .map(({ title, status }) => [title, status]),
    ).toEqual([
      ['CKA', 'in-progress'],
      ['CKAD', 'in-progress'],
    ]);
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
      as(await exec('kubectl get nodes', { now: new Date('2023-06-01T00:00:00Z') }), 'table').rows[0],
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

describe('get pods -n kube-system', () => {
  it('lists the four control plane static pods, all Running', async () => {
    const result = as(await exec('kubectl get pods -n kube-system'), 'table');
    expect(result.rows.map((row) => [row.name, row.ready, row.status])).toEqual([
      [
        { text: 'etcd-control-plane', run: 'kubectl describe pod etcd-control-plane -n kube-system' },
        '1/1',
        'Running',
      ],
      [
        {
          text: 'kube-apiserver-control-plane',
          run: 'kubectl describe pod kube-apiserver-control-plane -n kube-system',
        },
        '1/1',
        'Running',
      ],
      [
        {
          text: 'kube-controller-manager-control-plane',
          run: 'kubectl describe pod kube-controller-manager-control-plane -n kube-system',
        },
        '1/1',
        'Running',
      ],
      [
        {
          text: 'kube-scheduler-control-plane',
          run: 'kubectl describe pod kube-scheduler-control-plane -n kube-system',
        },
        '1/1',
        'Running',
      ],
    ]);
  });

  it('finds one by its short name and prints names with -o name', async () => {
    expect(as(await exec('kubectl get pods etcd -n kube-system'), 'table').rows).toHaveLength(1);
    expect(texts(await exec('kubectl get pods -n kube-system -o name'))[0]).toBe('pod/etcd-control-plane');
  });
});

describe('get componentstatuses', () => {
  it.each(['kubectl get cs', 'kubectl get componentstatuses', 'kubectl get componentstatus'])(
    '%s prints the deprecation warning, then healthy components',
    async (input) => {
      const result = as(await exec(input), 'table');
      expect(result.warning).toBe('Warning: v1 ComponentStatus is deprecated in v1.19+');
      expect(labels(result)).toEqual(['NAME', 'STATUS', 'MESSAGE', 'ERROR']);
      expect(result.rows).toEqual([
        { name: 'scheduler', status: 'Healthy', message: 'ok', error: '' },
        { name: 'controller-manager', status: 'Healthy', message: 'ok', error: '' },
        { name: 'etcd-0', status: 'Healthy', message: 'ok', error: '' },
      ]);
    },
  );
});

describe('get certificates and achievements by id', () => {
  it('names certificates by id, linked to describe', async () => {
    const result = as(await exec('kubectl get certificates'), 'table');
    expect(labels(result)).toEqual(['NAME', 'TITLE', 'ISSUER', 'STATUS', 'DATE']);
    expect(result.rows[2]).toEqual({
      name: { text: 'aws-saa', run: 'kubectl describe certificate aws-saa' },
      title: 'AWS Solutions Architect',
      issuer: 'AWS',
      status: 'issued',
      date: '2024-03',
    });
  });

  it('names achievements by id, linked to describe', async () => {
    const result = as(await exec('kubectl get achievements'), 'table');
    expect(labels(result)).toEqual(['NAME', 'TITLE', 'ORG', 'DATE']);
    expect(result.rows[0]).toEqual({
      name: { text: 'hackathon-win', run: 'kubectl describe achievement hackathon-win' },
      title: 'Hackathon win',
      org: 'NEU',
      date: '2025-02',
    });
  });
});

describe('get pods -l skill=', () => {
  it('lists the pods that used the skill and sets the scene filter, ignoring case', async () => {
    const result = as(await exec('kubectl get pods -l skill=KAFKA -n projects'), 'table');
    expect(result.rows.map((row) => row.status)).toEqual(['Completed']);
    expect(result.filter).toEqual({ skill: 'kafka' });
  });

  it('says no resources found for a skill nothing used, and sets no filter', async () => {
    const result = await exec('kubectl get pods -l skill=cobol -n projects');
    expect(texts(result)).toEqual(['No resources found in projects namespace.']);
  });

  it('matches no pods for another label key, and needs a value', async () => {
    expect(texts(await exec('kubectl get pods -l app=web -n projects'))).toEqual([
      'No resources found in projects namespace.',
    ]);
    expect(as(await exec('kubectl get pods -n projects -l'), 'error').message).toBe(
      "error: flag needs an argument: 'l' in -l",
    );
  });
});
