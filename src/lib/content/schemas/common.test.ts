import { describe, expect, it } from 'vitest';

import { endDate, httpsUrl, linkUrl, nodeName, slug, yearMonth } from './common';

describe('slug', () => {
  it.each(['asktrace', 'aws-iaas', 'roarceus-github-io', 'k8s-2'])('accepts %s', (value) => {
    expect(slug.safeParse(value).success).toBe(true);
  });

  it.each(['', 'AskTrace', 'aws_iaas', '-lead', 'trail-', 'double--dash', 'has space'])(
    'rejects %j',
    (value) => {
      expect(slug.safeParse(value).success).toBe(false);
    },
  );
});

describe('nodeName', () => {
  it('accepts a kebab-case node', () => {
    expect(nodeName.safeParse('mastercontrol').success).toBe(true);
  });

  it('rejects names longer than a Kubernetes label (63 chars)', () => {
    expect(nodeName.safeParse('a'.repeat(64)).success).toBe(false);
  });
});

describe('yearMonth', () => {
  it.each(['2021-05', '2026-12', '1999-01'])('accepts %s', (value) => {
    expect(yearMonth.safeParse(value).success).toBe(true);
  });

  it.each(['2025-13', '2025-00', '25-01', '2025-1', '2025-01-15', 'May 2021'])('rejects %s', (value) => {
    expect(yearMonth.safeParse(value).success).toBe(false);
  });
});

describe('endDate', () => {
  it('accepts a year-month or present', () => {
    expect(endDate.safeParse('2025-12').success).toBe(true);
    expect(endDate.safeParse('present').success).toBe(true);
  });

  it('rejects other words', () => {
    expect(endDate.safeParse('now').success).toBe(false);
  });
});

describe('httpsUrl', () => {
  it('accepts https URLs', () => {
    expect(httpsUrl.safeParse('https://github.com/roarceus').success).toBe(true);
  });

  it.each(['http://github.com', 'javascript:alert(1)', 'mailto:a@b.co', 'github.com', '/plain/'])(
    'rejects %s',
    (value) => {
      expect(httpsUrl.safeParse(value).success).toBe(false);
    },
  );
});

describe('linkUrl', () => {
  it('accepts https and mailto links', () => {
    expect(linkUrl.safeParse('https://linkedin.com/in/x').success).toBe(true);
    expect(linkUrl.safeParse('mailto:someone@example.com').success).toBe(true);
  });

  it('rejects mailto without an address and other schemes', () => {
    expect(linkUrl.safeParse('mailto:').success).toBe(false);
    expect(linkUrl.safeParse('tel:5550100').success).toBe(false);
  });
});
