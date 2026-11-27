import { describe, expect, it } from 'vitest';

import { SNAPSHOT } from './fixtures';
import { panelView } from './panel';

describe('panelView', () => {
  it('describes a node with its roles, newest first, and its pods', () => {
    expect(panelView(SNAPSHOT, { kind: 'node', name: 'mastercontrol' })).toEqual({
      kind: 'node',
      name: 'mastercontrol',
      run: 'kubectl describe node mastercontrol',
      label: SNAPSHOT.nodes.find((n) => n.name === 'mastercontrol')?.label,
      roles: [
        {
          title: 'DevOps Engineer (Co-op)',
          org: 'MasterControl',
          range: 'Jun 2025 - Dec 2025',
          summary: 'Platform work.',
          highlights: ['Shipped a bot.', 'Cut deploy time.'],
          tech: ['Kubernetes', 'Probot'],
        },
      ],
      pods: [{ slug: 'deployment-gating-bot', name: 'deployment-gating-bot', phase: 'Completed' }],
    });
  });

  it('describes a pod with its dates, tech, and outside links', () => {
    expect(panelView(SNAPSHOT, { kind: 'pod', name: 'asktrace' })).toEqual({
      kind: 'pod',
      name: 'asktrace',
      run: 'kubectl describe pod asktrace',
      title: 'askTRACE',
      summary: 'Course survey insights: Kafka, GKE, and RAG.',
      phase: 'Completed',
      node: 'northeastern',
      range: 'Jan 2025 - Apr 2025',
      tech: ['Go', 'Kafka'],
      links: [{ label: 'Source on GitHub', href: 'https://github.com/trace-survey-analysis' }],
    });
  });

  it('adds the demo after the source', () => {
    const projects = SNAPSHOT.projects.map((p) =>
      p.slug === 'asktrace' ? { ...p, demo: 'https://demo.example' } : p,
    );
    expect(panelView({ ...SNAPSHOT, projects }, { kind: 'pod', name: 'asktrace' })).toMatchObject({
      links: [
        { label: 'Source on GitHub', href: 'https://github.com/trace-survey-analysis' },
        { label: 'Demo', href: 'https://demo.example' },
      ],
    });
  });

  it('leaves out the node and dates of an unscheduled pod', () => {
    const view = panelView(SNAPSHOT, { kind: 'pod', name: 'roarceus-github-io' });
    expect(view).toMatchObject({ node: undefined, range: undefined, phase: 'Running' });
  });

  it('gives a pod with no public links none', () => {
    expect(panelView(SNAPSHOT, { kind: 'pod', name: 'deployment-gating-bot' })).toMatchObject({ links: [] });
  });

  it('returns nothing for names it does not know', () => {
    expect(panelView(SNAPSHOT, { kind: 'node', name: 'nope' })).toBeUndefined();
    expect(panelView(SNAPSHOT, { kind: 'pod', name: 'nope' })).toBeUndefined();
  });

  it('leaves the contact manifest to its own component', () => {
    expect(panelView(SNAPSHOT, { kind: 'contact', name: 'sohan' })).toBeUndefined();
  });
});
