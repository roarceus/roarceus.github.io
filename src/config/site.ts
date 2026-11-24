/** Site-wide metadata. Portfolio content (roles, projects, links) lives in src/content/ from Stage 1. */
export const site = {
  name: 'Sohan Patil',
  title: 'Software engineer: DevOps, cloud, and full stack',
  description:
    "Sohan Patil's portfolio, built as an interactive Kubernetes cluster. The full site is under construction.",
  url: 'https://roarceus.github.io',
  locale: 'en',
  /** Browser UI color; must match the --bg token (meta tags can't read CSS variables). */
  themeColor: '#0a0e14',
} as const;
