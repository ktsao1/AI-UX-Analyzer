import { useLayoutEffect, useRef, useState } from 'react';
import type { Hotspot, Prototype, Screen } from '../lib/types';
import { reachableScreens } from '../lib/prototype';
import { FigmaMark } from './Kit';

// The file as Figma shows it in Prototype mode: one row per flow, from the
// frame its starting point is set on, each frame named above it, and the
// connections drawn in Figma's blue from the element that is wired to the
// next frame. Inside the canvas the blue is Figma's, so it reads as the file;
// outside it, yellow still means "chosen".

// Frames are drawn at THUMB_H tall, and smaller when the longest row would
// not fit the canvas (down to MIN_THUMB_H, below which the page scrolls).
const THUMB_H = 176;
const MIN_THUMB_H = 112;
const NAME_H = 28;
const GAP_K = 0.42;
const PAD = 24;
const MAX_FRAMES = 7;
const ARRIVE_Y = 26;

interface Props {
  prototype: Prototype;
  thumbs: Record<string, string>;
  flowIndex: number | null;
  onFlow: (index: number) => void;
  locked: boolean;
  sample: boolean;
}

/** The path a row draws: from the start, each frame's first link to a frame
 *  not yet shown. A flow is a graph; a row shows its main line. */
function chainOf(prototype: Prototype, startId: string): { screens: Screen[]; links: (Hotspot | undefined)[] } {
  const screens: Screen[] = [];
  const links: (Hotspot | undefined)[] = [];
  const seen = new Set<string>();
  let current: Screen | undefined = prototype.screens[startId];
  while (current && screens.length < MAX_FRAMES) {
    screens.push(current);
    seen.add(current.id);
    const next: Hotspot | undefined = current.hotspots.find((h) => h.target.kind === 'screen' && !seen.has(h.target.screenId) && prototype.screens[h.target.screenId]);
    if (!next || next.target.kind !== 'screen') break;
    links.push(next);
    current = prototype.screens[next.target.screenId];
  }
  return { screens, links };
}

const ratio = (s: Screen) => (s.box && s.box.height > 0 ? Math.min(1.2, Math.max(0.3, s.box.width / s.box.height)) : 9 / 19.5);

function Row({ th, prototype, thumbs, startId, name, picked, dim, onPick, locked }: {
  th: number; prototype: Prototype; thumbs: Record<string, string>; startId: string; name: string; picked: boolean; dim: boolean; onPick: () => void; locked: boolean;
}) {
  const { screens, links } = chainOf(prototype, startId);
  const more = reachableScreens(prototype, startId).length - screens.length;
  const GAP = Math.round(th * GAP_K);
  const widths = screens.map((s) => Math.round(th * ratio(s)));
  const xs = widths.map((_, i) => PAD + widths.slice(0, i).reduce((a, w) => a + w + GAP, 0));
  const width = xs[xs.length - 1] + widths[widths.length - 1] + PAD + (more > 0 ? 96 : 0);

  return (
    // Clicking a row picks it; the list beside the canvas is the control
    // a keyboard or screen reader uses.
    <div className="fc-row" data-picked={picked} data-dim={dim} style={{ width, height: NAME_H + th }} onClick={locked ? undefined : onPick}>
      {screens.map((s, i) => (
        <div key={s.id} className="fc-frame" style={{ left: xs[i], width: widths[i] }}>
          {i === 0 ? (
            <span className="fc-tag">
              <svg width="9" height="10" viewBox="0 0 11 12" aria-hidden="true"><path d="M1 1 L10 6 L1 11 Z" fill="currentColor" /></svg>
              {name}
            </span>
          ) : (
            <span className="fc-name">{s.name}</span>
          )}
          <div className="fc-shot" style={{ height: th }}>
            {thumbs[s.id] ? <img src={thumbs[s.id]} alt="" loading="lazy" /> : <span className="label">…</span>}
          </div>
        </div>
      ))}
      {more > 0 && <span className="fc-more label" style={{ left: xs[xs.length - 1] + widths[widths.length - 1] + 24, top: NAME_H + th / 2 - 9 }}>+{more} more</span>}
      <svg className="fc-wires" width={width} height={NAME_H + th} aria-hidden="true">
        {links.map((h, i) => {
          const s = screens[i];
          const k = th / (s.box?.height || 1);
          // Leave from the wired element's right edge, at its middle; a
          // hotspot without a box leaves from the frame's edge.
          const hx = h?.box && s.box ? Math.min(widths[i] - 4, (h.box.x - s.box.x + h.box.width) * k - 4) : widths[i];
          const hy = h?.box && s.box ? Math.min(th - 4, Math.max(4, (h.box.y - s.box.y + h.box.height / 2) * k)) : th / 2;
          const sx = xs[i] + hx;
          const sy = NAME_H + hy;
          const tx = xs[i + 1] - 3;
          const ty = NAME_H + ARRIVE_Y;
          return (
            <g key={i}>
              <path d={`M ${sx} ${sy} C ${sx + 48} ${sy}, ${tx - 44} ${ty}, ${tx} ${ty}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d={`M ${tx - 7} ${ty - 5} L ${tx} ${ty} L ${tx - 7} ${ty + 5}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={sx} cy={sy} r="4.5" fill="#fff" stroke="currentColor" strokeWidth="2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** How wide a row is per unit of frame height, so the canvas can work out
 *  the frame height at which the longest row just fits. */
function rowUnits(prototype: Prototype, startId: string): { perTh: number; fixed: number } {
  const { screens } = chainOf(prototype, startId);
  const more = reachableScreens(prototype, startId).length > screens.length ? 96 : 0;
  return { perTh: screens.reduce((a, s) => a + ratio(s), 0) + (screens.length - 1) * GAP_K, fixed: 2 * PAD + more };
}

export function FlowCanvas(p: Props) {
  const flows = p.prototype.flows;
  const page = useRef<HTMLDivElement>(null);
  const [th, setTh] = useState(THUMB_H);
  useLayoutEffect(() => {
    const el = page.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientWidth;
      const tightest = Math.min(...flows.map((f) => {
        const u = rowUnits(p.prototype, f.startId);
        return (avail - u.fixed) / u.perTh;
      }));
      setTh(Math.round(Math.max(MIN_THUMB_H, Math.min(THUMB_H, tightest))));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [p.prototype, flows]);
  return (
    <div className="flowview">
      <figure className="plate fc" aria-label={`Prototype flows in ${p.sample ? 'the sample prototype' : `“${p.prototype.name}”`}: ${flows.map((f) => f.name).join(', ')}`}>
        <div className="fc-head">
          <FigmaMark />
          <b>{p.sample ? 'Sample prototype' : p.prototype.name}</b>
          <span aria-hidden="true">/</span>
          <span>Prototype</span>
        </div>
        <div className="fc-page" ref={page}>
          {flows.map((f, i) => (
            <Row
              key={f.startId}
              th={th}
              prototype={p.prototype}
              thumbs={p.thumbs}
              startId={f.startId}
              name={f.name}
              picked={p.flowIndex === i}
              dim={p.flowIndex !== null && p.flowIndex !== i}
              onPick={() => p.onFlow(i)}
              locked={p.locked}
            />
          ))}
        </div>
      </figure>

      <div className="plate pad fc-list">
        <p className="fc-list-head">Select a prototype flow to evaluate:</p>
        <div className="fc-options" role="radiogroup" aria-label="Prototype flow">
          {flows.map((f, i) => (
            <button key={f.startId} type="button" role="radio" className="plate fc-option" aria-checked={p.flowIndex === i} disabled={p.locked} onClick={() => p.onFlow(i)}>
              <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true"><path d="M1 1 L10 6 L1 11 Z" fill="currentColor" /></svg>
              {f.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
