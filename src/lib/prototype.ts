import type { Flow, Hotspot, Prototype, Rect, Screen } from './types';

// The slice of Figma's file JSON this needs. See
// https://www.figma.com/developers/api#node-types
export interface FigmaAction {
  type?: string;
  destinationId?: string | null;
  navigation?: string;
}
export interface FigmaInteraction {
  trigger?: { type?: string } | null;
  // Older files carry one `action`; newer ones a list of `actions`.
  action?: FigmaAction | null;
  actions?: (FigmaAction | null)[];
}
export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];
  characters?: string;
  absoluteBoundingBox?: Rect | null;
  interactions?: FigmaInteraction[];
  reactions?: FigmaInteraction[];
  transitionNodeID?: string | null;
  flowStartingPoints?: { nodeId: string; name: string }[];
}

const TAP_TRIGGERS = new Set(['ON_CLICK', 'ON_PRESS', 'ON_TAP', 'MOUSE_DOWN', 'MOUSE_UP']);

function actionsOf(node: FigmaNode): { trigger: string; action: FigmaAction }[] {
  const found: { trigger: string; action: FigmaAction }[] = [];
  for (const interaction of [...(node.interactions ?? []), ...(node.reactions ?? [])]) {
    const trigger = interaction.trigger?.type ?? 'ON_CLICK';
    const actions = interaction.actions ?? (interaction.action ? [interaction.action] : []);
    for (const action of actions) if (action) found.push({ trigger, action });
  }
  // The oldest form: a bare destination on the node.
  if (node.transitionNodeID && !found.some((f) => f.action.destinationId === node.transitionNodeID)) {
    found.push({ trigger: 'ON_CLICK', action: { type: 'NODE', destinationId: node.transitionNodeID } });
  }
  return found;
}

function textWithin(node: FigmaNode, out: Set<string>) {
  if (node.visible === false) return;
  if (node.type === 'TEXT' && node.characters) out.add(node.characters.toLowerCase().trim());
  node.children?.forEach((child) => textWithin(child, out));
}

/** Turn a Figma document into the screens and hotspots the analyzer walks.
 *
 *  A screen is a top-level frame on a page. A hotspot is any layer inside it
 *  with a tap interaction that navigates to another screen (or goes back).
 *  An interaction that lands on a layer inside a frame is taken to that
 *  frame. Flows are the file's named starting points; a file without any
 *  gets one flow per frame that nothing links to, so it can still be run. */
export function buildPrototype(document: FigmaNode, name = 'Untitled'): Prototype {
  const screens: Record<string, Screen> = {};
  const screenOf = new Map<string, string>();
  const frames: FigmaNode[] = [];
  const flows: Flow[] = [];

  for (const page of document.children ?? []) {
    if (page.type !== 'CANVAS') continue;
    for (const start of page.flowStartingPoints ?? []) {
      if (!flows.some((f) => f.startId === start.nodeId)) flows.push({ name: start.name || 'Untitled flow', startId: start.nodeId });
    }
    for (const frame of page.children ?? []) {
      if (!['FRAME', 'COMPONENT', 'INSTANCE', 'SECTION'].includes(frame.type)) continue;
      // A section is a folder of frames, not a screen.
      const list = frame.type === 'SECTION' ? (frame.children ?? []).filter((c) => c.type === 'FRAME' || c.type === 'COMPONENT' || c.type === 'INSTANCE') : [frame];
      for (const f of list) {
        if (f.visible === false) continue;
        frames.push(f);
        const mark = (n: FigmaNode) => {
          screenOf.set(n.id, f.id);
          n.children?.forEach(mark);
        };
        mark(f);
      }
    }
  }

  for (const frame of frames) {
    const hotspots: Hotspot[] = [];
    const visit = (node: FigmaNode) => {
      if (node.visible === false) return;
      for (const { trigger, action } of actionsOf(node)) {
        if (!TAP_TRIGGERS.has(trigger)) continue;
        let target: Hotspot['target'] | null = null;
        if (action.type === 'BACK') target = { kind: 'back' };
        else if (action.type === 'NODE' && action.destinationId) {
          const screenId = screenOf.get(action.destinationId);
          // Overlays and scroll-tos stay on the same screen; skip them.
          if (screenId && screenId !== frame.id) target = { kind: 'screen', screenId };
        }
        if (!target) continue;
        const keywords = new Set<string>();
        textWithin(node, keywords);
        const labelled = keywords.size > 0;
        if (node.id !== frame.id) keywords.add(node.name.toLowerCase().trim());
        hotspots.push({
          id: `${node.id}>${target.kind === 'back' ? 'back' : target.screenId}`,
          name: node.name,
          keywords: [...keywords].filter(Boolean),
          labelled,
          box: node.absoluteBoundingBox ?? undefined,
          target,
        });
      }
      node.children?.forEach(visit);
    };
    visit(frame);
    screens[frame.id] = { id: frame.id, name: frame.name, box: frame.absoluteBoundingBox ?? undefined, hotspots };
  }

  const usable = flows.filter((f) => screens[f.startId]);
  if (usable.length === 0) {
    const linkedTo = new Set<string>();
    for (const s of Object.values(screens)) for (const h of s.hotspots) if (h.target.kind === 'screen') linkedTo.add(h.target.screenId);
    for (const s of Object.values(screens)) {
      if (s.hotspots.length > 0 && !linkedTo.has(s.id)) usable.push({ name: s.name, startId: s.id });
    }
  }

  return { name, screens, flows: usable };
}

/** Every screen a flow can reach from its start, in the order found. */
export function reachableScreens(prototype: Prototype, startId: string): Screen[] {
  const seen = new Set<string>();
  const order: Screen[] = [];
  const queue = [startId];
  while (queue.length) {
    const id = queue.shift()!;
    const screen = prototype.screens[id];
    if (!screen || seen.has(id)) continue;
    seen.add(id);
    order.push(screen);
    for (const h of screen.hotspots) if (h.target.kind === 'screen') queue.push(h.target.screenId);
  }
  return order;
}
