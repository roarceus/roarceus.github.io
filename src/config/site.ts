/** Site-wide metadata. Portfolio content (roles, projects, links) lives in src/content/. */
export const site = {
  name: 'Sohan Patil',
  title: 'Software Engineer (DevOps, Cloud, Full Stack)',
  description:
    'Sohan Patil, software engineer in the San Francisco Bay Area. Backend services, CI/CD pipelines, and Kubernetes tooling.',
  url: 'https://roarceus.github.io',
  repo: 'https://github.com/roarceus/roarceus.github.io',
  /**
   * Contact form (Web3Forms). The access key is public by design: it only lets a page send
   * messages to my inbox. Rotating it: docs/runbooks/rotating-public-keys.md.
   */
  contact: {
    endpoint: 'https://api.web3forms.com/submit',
    accessKey: 'e7cdbe25-96dd-41c6-ae5c-d885d9053348',
  },
  locale: 'en',
  /** Browser UI color; must match the --bg token (meta tags can't read CSS variables). */
  themeColor: '#0a0e14',
} as const;
