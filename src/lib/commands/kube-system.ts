/**
 * The control plane in `kube-system` (design doc stage-4 §5): kubeadm-style static pod names, with the
 * short component names accepted too. The descriptions are site UI text and only describe what exists now.
 */

export const KUBE_SYSTEM = 'kube-system';

export interface Component {
  /** The static pod name (`etcd-control-plane`). */
  name: string;
  /** The component name (`etcd`), also accepted in `describe` and Tab completion. */
  short: string;
  description: string;
}

export const COMPONENTS: readonly Component[] = [
  {
    name: 'etcd-control-plane',
    short: 'etcd',
    description: 'Stores the cluster state: here, the content files the site is built from.',
  },
  {
    name: 'kube-apiserver-control-plane',
    short: 'kube-apiserver',
    description: 'Answers every command typed or clicked in this terminal.',
  },
  {
    name: 'kube-controller-manager-control-plane',
    short: 'kube-controller-manager',
    description: 'Keeps the map in step with the content: each build places every project again.',
  },
  {
    name: 'kube-scheduler-control-plane',
    short: 'kube-scheduler',
    description: 'Places each project pod on the node where I built it; planned ones wait as Pending.',
  },
];

/** The component a name refers to, by static pod name or short name, ignoring case. */
export function findComponent(name: string): Component | undefined {
  const lower = name.toLowerCase();
  return COMPONENTS.find((component) => component.name === lower || component.short === lower);
}

/** `get componentstatuses` rows: kubectl still prints these, after its deprecation warning. */
export const COMPONENT_STATUSES = ['scheduler', 'controller-manager', 'etcd-0'];
export const CS_WARNING = 'Warning: v1 ComponentStatus is deprecated in v1.19+';
