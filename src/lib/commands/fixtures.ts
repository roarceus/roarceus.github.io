import type { ClusterSnapshot } from '@/lib/content/snapshot';

import type { CommandContext, DataContext } from './types';

/** One snapshot shaped like the real content, shared by every command test. */
export const SNAPSHOT: ClusterSnapshot = {
  version: 2,
  build: { version: '0.4.0', commit: 'abc1234' },
  profile: {
    name: 'Sohan Patil',
    title: 'Software Engineer',
    location: 'Boston, MA',
    tagline: 'I build platforms.',
    links: {
      github: 'https://github.com/roarceus',
      linkedin: 'https://www.linkedin.com/in/sohan',
      email: 'hello@example.com',
    },
    resume: 'resume.pdf',
  },
  nodes: [
    {
      name: 'northeastern',
      label: 'Northeastern University',
      role: 'education',
      cordoned: false,
      pods: [{ slug: 'asktrace', name: 'askTRACE', phase: 'Completed' }],
    },
    {
      name: 'mastercontrol',
      label: 'MasterControl',
      role: 'work',
      cordoned: false,
      pods: [{ slug: 'deployment-gating-bot', name: 'deployment-gating-bot', phase: 'Completed' }],
    },
  ],
  unscheduled: [{ slug: 'roarceus-github-io', name: 'This portfolio', phase: 'Running' }],
  selected: 'mastercontrol',
  experience: [
    {
      name: 'northeastern-ta',
      org: 'Northeastern University',
      role: 'Teaching Assistant, Network Structures & Cloud Computing (CSYE 6225)',
      type: 'teaching',
      node: 'northeastern',
      start: '2026-01',
      end: '2026-04',
      summary: 'Helped students ship cloud apps.',
      tech: ['AWS', 'Terraform'],
      highlights: ['Ran labs.'],
    },
    {
      name: 'mastercontrol',
      org: 'MasterControl',
      role: 'DevOps Engineer (Co-op)',
      type: 'work',
      node: 'mastercontrol',
      start: '2025-06',
      end: '2025-12',
      summary: 'Platform work.',
      tech: ['Kubernetes', 'Probot'],
      highlights: ['Shipped a bot.', 'Cut deploy time.'],
    },
  ],
  education: [
    {
      name: 'northeastern',
      school: 'Northeastern University',
      degree: 'Master of Science',
      field: 'Information Systems',
      node: 'northeastern',
      start: '2024-01',
      end: '2026-04',
      highlights: [],
    },
  ],
  projects: [
    {
      slug: 'asktrace',
      name: 'askTRACE',
      summary: 'Course survey insights: Kafka, GKE, and RAG.',
      phase: 'Completed',
      node: 'northeastern',
      tech: ['Go', 'Kafka'],
      start: '2025-01',
      end: '2025-04',
      repo: 'https://github.com/trace-survey-analysis',
      demo: undefined,
      story: [],
    },
    {
      slug: 'roarceus-github-io',
      name: 'This portfolio',
      summary: 'This site.',
      phase: 'Running',
      node: undefined,
      tech: ['Astro'],
      start: undefined,
      end: undefined,
      repo: 'https://github.com/roarceus/roarceus.github.io',
      demo: undefined,
      story: [],
    },
    {
      slug: 'deployment-gating-bot',
      name: 'deployment-gating-bot',
      summary: 'Gates deploys.',
      phase: 'Completed',
      node: 'mastercontrol',
      tech: ['Probot'],
      start: '2025-07',
      end: '2025-12',
      repo: undefined,
      demo: undefined,
      story: [],
    },
  ],
  skills: [
    {
      category: 'Cloud',
      items: [
        { name: 'AWS', level: 4 },
        { name: 'GCP', level: 3 },
      ],
    },
    { category: 'Tools', items: [{ name: 'Git' }] },
  ],
  certifications: [
    { id: 'cka', name: 'CKA', issuer: 'CNCF', status: 'in-progress', date: undefined },
    { id: 'ckad', name: 'CKAD', issuer: 'CNCF', status: 'in-progress', date: undefined },
    { id: 'aws-saa', name: 'AWS Solutions Architect', issuer: 'AWS', status: 'issued', date: '2024-03' },
  ],
  achievements: [
    {
      id: 'hackathon-win',
      title: 'Hackathon win',
      org: 'NEU',
      node: undefined,
      date: '2025-02',
      summary: 'Won it.',
      link: undefined,
    },
  ],
  updates: [
    {
      slug: 'stage-3',
      title: 'Terminal online',
      date: '2026-11-20',
      summary: 'Type commands.',
      node: undefined,
      project: undefined,
    },
    {
      slug: 'stage-2',
      title: 'Dashboard',
      date: '2026-10-01',
      summary: 'A cluster view.',
      node: undefined,
      project: undefined,
    },
  ],
};

export const NOW = new Date('2026-11-26T00:00:00Z');

export const ctx = (overrides: Partial<CommandContext> = {}): DataContext =>
  ({
    snapshot: SNAPSHOT,
    build: { version: '0.4.0', commit: 'abc1234' },
    base: '/',
    now: NOW,
    ...overrides,
  }) as DataContext;
