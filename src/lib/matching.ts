import type { GridCell, Hotspot, Rect, Screen } from './types';

/** Which cell of a 3×3 grid over the screen an element's centre falls in. */
export function gridCell(box: Rect, screen: Rect): GridCell {
  const cx = box.x - screen.x + box.width / 2;
  const cy = box.y - screen.y + box.height / 2;
  const row = cy < screen.height / 3 ? 'top' : cy < (screen.height * 2) / 3 ? 'center' : 'bottom';
  const col = cx < screen.width / 3 ? 'left' : cx < (screen.width * 2) / 3 ? 'center' : 'right';
  return (row === 'center' && col === 'center' ? 'center' : `${row}-${col}`) as GridCell;
}

const CELLS: GridCell[] = ['top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'];

/** Normalise whatever the model wrote ("Top Left", "middle-right",
 *  "center-center") to a grid cell. */
export function parseGridCell(raw: string | null | undefined): GridCell | null {
  if (!raw) return null;
  const s = raw.toLowerCase().replace(/[\s_]+/g, '-').replace(/middle/g, 'center').replace(/centre/g, 'center').trim();
  if (s === 'center-center') return 'center';
  return (CELLS as string[]).includes(s) ? (s as GridCell) : null;
}

const normalise = (s: string) => s.toLowerCase().replace(/["'“”‘’]/g, '').replace(/\s+/g, ' ').trim();

/** How well a hotspot's words fit the name the model gave: 3 for the same
 *  words, 2 when one contains the other, 0 for no relation. Very short
 *  keywords ("ok", "x") only count as an exact match, so they do not match
 *  every sentence that happens to contain them. */
export function textScore(hotspot: Hotspot, component: string): number {
  const want = normalise(component);
  if (!want) return 0;
  let best = 0;
  for (const raw of hotspot.keywords) {
    const kw = normalise(raw);
    if (!kw) continue;
    if (kw === want) return 3;
    if (kw.length > 2 && want.length > 2 && (want.includes(kw) || kw.includes(want))) best = 2;
  }
  return best;
}

export type MatchResult =
  | { kind: 'match'; hotspot: Hotspot }
  /** The model named something the prototype has no interaction for. */
  | { kind: 'design-gap' }
  /** Several hotspots fit equally well and nothing told them apart. */
  | { kind: 'ambiguous' };

/** Find the hotspot the model meant. Its words decide; the grid cell breaks
 *  ties. When no words fit, an unlabelled hotspot (an icon) that is alone in
 *  the named cell is taken, because the model describes an icon in its own
 *  words rather than by its layer name. A labelled one is never taken on
 *  position alone: if the model read "Help" and the only wired element
 *  nearby says "Settings", it did not mean Settings. Otherwise the model
 *  reached for something that is not wired: a design gap. */
export function matchHotspot(screen: Screen, component: string, location: GridCell | null): MatchResult {
  const inCell = (h: Hotspot) => Boolean(location && h.box && screen.box && gridCell(h.box, screen.box) === location);
  const scored = screen.hotspots.map((h) => ({ h, text: textScore(h, component) })).filter((s) => s.text > 0);

  if (scored.length === 0) {
    const byCell = screen.hotspots.filter((h) => inCell(h) && !h.labelled);
    return byCell.length === 1 ? { kind: 'match', hotspot: byCell[0] } : { kind: 'design-gap' };
  }

  const top = Math.max(...scored.map((s) => s.text));
  const best = scored.filter((s) => s.text === top).map((s) => s.h);
  // The same element can carry two interactions to one place; that is one
  // choice, not two.
  const targets = new Set(best.map((h) => (h.target.kind === 'back' ? 'back' : h.target.screenId)));
  if (best.length === 1 || targets.size === 1) return { kind: 'match', hotspot: best[0] };

  const here = best.filter(inCell);
  if (here.length >= 1 && new Set(here.map((h) => (h.target.kind === 'back' ? 'back' : h.target.screenId))).size === 1) {
    return { kind: 'match', hotspot: here[0] };
  }
  return { kind: 'ambiguous' };
}

/** Centre of a hotspot as a percentage of its screen, clamped to it. */
export function tapPoint(hotspot: Hotspot, screen: Screen): { x: number; y: number } | undefined {
  if (!hotspot.box || !screen.box || !screen.box.width || !screen.box.height) return undefined;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return {
    x: clamp(((hotspot.box.x + hotspot.box.width / 2 - screen.box.x) / screen.box.width) * 100),
    y: clamp(((hotspot.box.y + hotspot.box.height / 2 - screen.box.y) / screen.box.height) * 100),
  };
}
