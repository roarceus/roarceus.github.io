import { describe, expect, it } from 'vitest';

import { SNAPSHOT } from './fixtures';
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

describe('describe pod in kube-system', () => {
  it.each(['etcd', 'etcd-control-plane', 'ETCD'])('%s gives the etcd view', async (name) => {
    const result = as(await exec(`kubectl describe pod ${name} -n kube-system`), 'detail');
    expect(result.target).toEqual({ kind: 'component', name: 'etcd-control-plane' });
    expect(result.lines.slice(0, 4)).toEqual([
      { text: 'Name:         etcd-control-plane' },
      { text: 'Namespace:    kube-system' },
      { text: 'Labels:       component=etcd, tier=control-plane' },
      { text: 'Status:       Running' },
    ]);
  });

  it('is not found outside kube-system, with a suggestion that adds the namespace', async () => {
    expect(as(await exec('kubectl describe pod etcd'), 'error')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): pods "etcd" not found',
      suggestion: 'kubectl describe pod etcd -n kube-system',
    });
  });

  it('suggests a close component name in kube-system', async () => {
    expect(as(await exec('kubectl describe pod kube-schedular -n kube-system'), 'error').suggestion).toBe(
      'kubectl describe pod kube-scheduler-control-plane -n kube-system',
    );
  });
});

describe('describe pod (pending)', () => {
  it('shows Pending, PodScheduled False, and a FailedScheduling event', async () => {
    const pending = {
      summary: 'A planned lab.',
      tech: ['Go'],
      repo: undefined,
      demo: undefined,
      story: [],
      slug: 'homelab',
      name: 'Homelab',
      phase: 'Pending' as const,
      node: undefined,
      start: undefined,
      end: undefined,
    };
    const snapshot = {
      ...SNAPSHOT,
      nodes: [
        ...SNAPSHOT.nodes,
        { name: 'mumbai', label: 'Mumbai', role: 'education' as const, cordoned: true, pods: [] },
      ],
      projects: [...SNAPSHOT.projects, pending],
    };
    const { lines } = as(await exec('kubectl describe pod homelab', { snapshot }), 'detail');
    const text = lines.map((line) => line.text);
    expect(text).toContain('Status:       Pending');
    expect(text.slice(-6)).toEqual([
      'Conditions:',
      '  Type           Status  Reason',
      '  PodScheduled   False   Unschedulable',
      'Events:',
      '  Type     Reason            Age        From               Message',
      "  Warning  FailedScheduling  <unknown>  default-scheduler  0/3 nodes are available: 1 node(s) were unschedulable, 2 node(s) didn't match Pod's node affinity/selector.",
    ]);
  });
});

describe('describe certificate and achievement', () => {
  it('selects a certificate by id', async () => {
    const result = as(await exec('kubectl describe certificate aws-saa'), 'detail');
    expect(result.target).toEqual({ kind: 'certificate', name: 'aws-saa' });
    expect(result.lines).toEqual([
      { text: 'Name:         aws-saa' },
      { text: 'Title:        AWS Solutions Architect' },
      { text: 'Issuer:       AWS' },
      { text: 'Status:       issued' },
      { text: 'Date:         2024-03' },
    ]);
  });

  it('selects an achievement by id, linking its node', async () => {
    const snapshot = {
      ...SNAPSHOT,
      achievements: [
        {
          id: 'hackathon-win',
          title: 'Hackathon win',
          org: 'NEU',
          date: '2025-02',
          summary: 'Won it.',
          node: 'northeastern',
          link: 'https://example.com/win',
        },
      ],
    };
    const result = as(await exec('kubectl describe achievement/hackathon-win', { snapshot }), 'detail');
    expect(result.target).toEqual({ kind: 'achievement', name: 'hackathon-win' });
    expect(result.lines).toEqual([
      { text: 'Name:         hackathon-win' },
      { text: 'Title:        Hackathon win' },
      { text: 'Org:          NEU' },
      { text: 'Node:         northeastern', run: 'kubectl describe node northeastern' },
      { text: 'Date:         2025-02' },
      { text: 'Summary:      Won it.' },
      { text: 'Link:         https://example.com/win', href: 'https://example.com/win' },
    ]);
  });

  it('suggests close ids for unknown ones', async () => {
    expect(as(await exec('kubectl describe cert ckaa'), 'error')).toEqual({
      kind: 'error',
      message: 'Error from server (NotFound): certificates "ckaa" not found',
      suggestion: 'kubectl describe certificate cka',
    });
    expect(as(await exec('kubectl describe achievement hackaton-win'), 'error').suggestion).toBe(
      'kubectl describe achievement hackathon-win',
    );
  });
});

describe('describe node (schools and cordoned eras)', () => {
  it('prints the degree on its node and marks cordoned eras Unschedulable', async () => {
    const snapshot = {
      ...SNAPSHOT,
      nodes: [
        {
          name: 'mumbai',
          label: 'University of Mumbai',
          role: 'education' as const,
          cordoned: true,
          pods: [],
        },
      ],
      experience: [],
      education: [
        {
          name: 'mumbai',
          school: 'University of Mumbai',
          degree: 'Bachelor of Engineering',
          field: 'Computer Engineering',
          node: 'mumbai',
          start: '2016-08',
          end: '2020-10',
          highlights: ['Built a book review system.'],
        },
      ],
    };
    const { lines } = as(await exec('kubectl describe node mumbai', { snapshot }), 'detail');
    expect(lines.map((line) => line.text)).toEqual([
      'Name:         mumbai',
      'Roles:        education',
      'Labels:       org=University of Mumbai',
      'Unschedulable: true',
      'Degree:       Bachelor of Engineering, Computer Engineering',
      'Period:       2016-08 to 2020-10',
      'Highlights:',
      '  - Built a book review system.',
      'Pods:         <none>',
    ]);
  });
});
