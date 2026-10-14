import { Fragment } from 'react';
import { reachableScreens } from '../lib/prototype';
import type { Prototype } from '../lib/types';
import { Button, FigmaMark } from './Kit';

interface Props {
  url: string;
  onUrl: (url: string) => void;
  onFetch: () => void;
  onSample: () => void;
  onSettings: () => void;
  fetching: boolean;
  hasKeys: boolean;
  locked: boolean;
  prototype: Prototype | null;
  sample: boolean;
  thumbs: Record<string, string>;
  flowIndex: number | null;
  onFlow: (index: number) => void;
}

const MAX_FRAMES = 8;

export function LinkStep(p: Props) {
  const flow = p.prototype && p.flowIndex !== null ? p.prototype.flows[p.flowIndex] : null;
  const shown = p.prototype ? (flow ? reachableScreens(p.prototype, flow.startId) : Object.values(p.prototype.screens)) : [];
  const links = p.prototype ? Object.values(p.prototype.screens).reduce((n, s) => n + s.hotspots.length, 0) : 0;

  return (
    <>
      <form
        className="plate pad linkfield"
        onSubmit={(e) => {
          e.preventDefault();
          p.onFetch();
        }}
      >
        <label className="label" htmlFor="figma-url" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FigmaMark /> Figma Frame URL
        </label>
        <div className="linkfield-row">
          <input
            id="figma-url"
            className="field"
            type="url"
            inputMode="url"
            placeholder="https://www.figma.com/design/…?node-id=1-2"
            value={p.url}
            onChange={(e) => p.onUrl(e.target.value)}
            disabled={p.fetching || p.locked}
          />
          <Button type="submit" disabled={p.fetching || p.locked || !p.url.trim()}>{p.fetching ? 'Fetching…' : 'Fetch File Data'}</Button>
        </div>
        <div className="linkfield-foot">
          {p.hasKeys ? (
            <span>Any frame link from the file works. The tool reads the whole file's prototype.</span>
          ) : (
            <span>Your own file needs a Figma token and a Gemini key. <button type="button" className="link" onClick={p.onSettings}>Add them in Settings</button>.</span>
          )}
          <button type="button" className="link" onClick={p.onSample} disabled={p.fetching || p.locked}>No keys? Try the sample prototype</button>
        </div>
      </form>

      {p.prototype && (
        <div className="fade-in">
          <p className="muted" style={{ textAlign: 'center', marginTop: 28 }}>
            {p.sample ? 'Sample prototype' : `“${p.prototype.name}”`}: {Object.keys(p.prototype.screens).length} screens, {links} connections, {p.prototype.flows.length} {p.prototype.flows.length === 1 ? 'flow' : 'flows'}.
          </p>
          <div className="frames" aria-label={flow ? `Screens in the ${flow.name} flow` : 'Screens in the file'}>
            {shown.slice(0, MAX_FRAMES).map((screen, i) => (
              <Fragment key={screen.id}>
                {i > 0 && (
                  <svg className="frame-wire" width="34" height="14" viewBox="0 0 34 14" aria-hidden="true">
                    <path d="M0 7 H26 M20 1 L27 7 L20 13" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                )}
                <figure className="frame" style={{ margin: 0 }}>
                  <div className="frame-shot">
                    {p.thumbs[screen.id] ? <img src={p.thumbs[screen.id]} alt="" loading="lazy" /> : <span className="label">…</span>}
                  </div>
                  <figcaption className="label">{screen.name}</figcaption>
                </figure>
              </Fragment>
            ))}
            {shown.length > MAX_FRAMES && <span className="label" style={{ alignSelf: 'center' }}>+{shown.length - MAX_FRAMES} more</span>}
          </div>

          <div className="plate pad flows">
            {p.prototype.flows.length > 0 ? (
              <>
                <p style={{ fontWeight: 600 }}>Select a prototype flow to evaluate:</p>
                <div className="choices" role="radiogroup" aria-label="Prototype flow">
                  {p.prototype.flows.map((f, i) => (
                    <button key={f.startId} type="button" role="radio" className="plate choice" aria-checked={p.flowIndex === i} disabled={p.locked} onClick={() => p.onFlow(i)}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="notice">This file has no prototype connections to follow. In Figma, switch to Prototype, wire the screens together and set a flow starting point, then fetch again.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
