---
title: Code block fixture
---

A highlighted code block, checked under the CSP by `tests/e2e/csp.spec.ts`.

```ts
// Runs a command through the one run path.
export async function run(input: string): Promise<number> {
  const count = 3;
  return input.length + count;
}
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: asktrace
```
