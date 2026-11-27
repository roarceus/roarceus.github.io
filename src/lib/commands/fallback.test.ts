import { describe, expect, it } from 'vitest';

import { plainHref } from './fallback';

describe('plainHref', () => {
  it.each([
    ['kubectl describe pod asktrace', '/pr-preview/pr-9/projects/asktrace/'],
    ['kubectl describe pod/asktrace', '/pr-preview/pr-9/projects/asktrace/'],
    ['kubectl describe node mastercontrol', '/pr-preview/pr-9/plain/#experience'],
    ['kubectl apply -f contact.yaml', '/pr-preview/pr-9/plain/#contact'],
    ['kubectl get experience', '/pr-preview/pr-9/plain/#experience'],
    ['kubectl get nodes', '/pr-preview/pr-9/plain/#experience'],
    ['kubectl get pods -n projects', '/pr-preview/pr-9/plain/#projects'],
    ['k get projects', '/pr-preview/pr-9/plain/#projects'],
    ['kubectl top skills', '/pr-preview/pr-9/plain/#skills'],
    ['kubectl get certificates', '/pr-preview/pr-9/plain/#certifications'],
    ['kubectl get achievements', '/pr-preview/pr-9/plain/#awards'],
    ['kubectl logs updates', '/pr-preview/pr-9/updates/'],
    ['kubectl get events', '/pr-preview/pr-9/updates/'],
    ['help', '/pr-preview/pr-9/plain/'],
    ['kubectl version', '/pr-preview/pr-9/plain/'],
    ['not a command "', '/pr-preview/pr-9/plain/'],
  ])('%s links to %s', (run, href) => {
    expect(plainHref(run, '/pr-preview/pr-9/')).toBe(href);
  });
});
