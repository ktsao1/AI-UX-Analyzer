import { Button, Dots, FigmaMark, GeminiMark } from './Kit';

export interface Engines {
  figma: boolean;
  gemini: boolean;
}

/** The name, and the two services the tool stands on. Each chip lights
 *  while that service is being called, so it is always clear what is
 *  happening behind the screen. In sample mode neither is called. */
export function TopBar({ busy, sample, model, onSettings, onHome }: { busy: Engines; sample: boolean; model: string; onSettings: () => void; onHome: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="link wordmark" style={{ textDecoration: 'none' }} onClick={onHome}>AI Usability Analyzer</button>
      <div className="topbar-right">
        {sample ? (
          <span className="plate engine" data-on="true"><span>Sample mode · no API calls</span></span>
        ) : (
          <>
            <span className="plate engine" data-on={busy.figma} data-busy={busy.figma}><FigmaMark /><span>Figma</span><Dots /></span>
            <span className="plate engine" data-on={busy.gemini} data-busy={busy.gemini}><GeminiMark /><span>{model.replace(/-/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase())}</span><Dots /></span>
          </>
        )}
        <Button variant="ghost" size="small" onClick={onSettings}>Settings</Button>
      </div>
      <span className="sr-only" role="status">{busy.figma ? 'Fetching from Figma.' : busy.gemini ? 'Waiting for Gemini.' : ''}</span>
    </header>
  );
}
