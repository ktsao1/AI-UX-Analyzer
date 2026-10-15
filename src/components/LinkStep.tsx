import type { Prototype } from '../lib/types';
import { FlowCanvas } from './FlowCanvas';
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

export function LinkStep(p: Props) {
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
        <div className="fade-in link-preview">
          <p className="muted" style={{ textAlign: 'center', marginTop: 28 }}>
            {p.sample ? 'Sample prototype' : `“${p.prototype.name}”`}: {Object.keys(p.prototype.screens).length} screens, {links} connections, {p.prototype.flows.length} {p.prototype.flows.length === 1 ? 'flow' : 'flows'}.
          </p>
          {p.prototype.flows.length > 0 ? (
            <FlowCanvas prototype={p.prototype} thumbs={p.thumbs} flowIndex={p.flowIndex} onFlow={p.onFlow} locked={p.locked} sample={p.sample} />
          ) : (
            <div className="plate pad flows">
              <p className="notice">This file has no prototype connections to follow. In Figma, switch to Prototype, wire the screens together and set a flow starting point, then fetch again.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
