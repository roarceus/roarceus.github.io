import type { Command, CommandContext, Line } from './types';

/**
 * `help`, `kubectl --help`, and bare `kubectl` (SPEC §7): every command, each one clickable. The
 * describe examples use real names once the data has loaded, and point at the lists before that.
 */

const WIDTH = 38;

function entries({ snapshot }: CommandContext): [string, string, string?][] {
  const node = snapshot?.selected ?? snapshot?.nodes[0]?.name;
  const pod = snapshot?.projects[0]?.slug;
  return [
    ['kubectl cluster-info', 'About me'],
    ['kubectl get nodes', 'Career eras'],
    ['kubectl get experience', 'Roles'],
    node === undefined
      ? ['kubectl describe node <name>', 'Role details', 'kubectl get nodes']
      : [`kubectl describe node ${node}`, 'Role details'],
    ['kubectl get pods -n projects', 'Projects'],
    ['kubectl get pods -n projects -o wide', 'Projects with node and tech'],
    pod === undefined
      ? ['kubectl describe pod <name>', 'Project details', 'kubectl get pods -n projects']
      : [`kubectl describe pod ${pod}`, 'Project details'],
    ['kubectl get pods -n projects -o yaml', 'Projects as YAML'],
    ['kubectl top skills', 'Skills'],
    ['kubectl get certificates', 'Certifications'],
    ['kubectl get achievements', 'Achievements'],
    ['kubectl logs updates -f', 'Latest updates'],
    ['kubectl get events', 'Timeline'],
    ['kubectl get all', 'Everything at once'],
    ['kubectl port-forward github', 'Open GitHub'],
    ['kubectl port-forward linkedin', 'Open LinkedIn'],
    ['kubectl config use-context plain', 'Plain view'],
    ['kubectl version', 'Site version'],
    ['clear', 'Clear the screen'],
  ];
}

export const help: Command = {
  verb: 'help',
  readOnly: true,
  needsData: false,
  run: (_cmd, ctx) => {
    const lines: Line[] = [
      { text: 'kubectl controls this cluster. Click a command or type it.', tone: 'muted' },
      ...entries(ctx).map(([command, what, run]) => ({
        text: `  ${command.padEnd(WIDTH)}${what}`,
        run: run ?? command,
      })),
      { text: 'k is short for kubectl.', tone: 'muted' },
    ];
    return { kind: 'lines', lines };
  },
  complete: () => [],
};
