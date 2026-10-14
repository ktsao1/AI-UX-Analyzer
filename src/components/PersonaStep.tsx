import { PARAMETERS, parametersReady, PREDEFINED_PERSONAS } from '../lib/personas';
import type { PersonaParameters } from '../lib/types';
import { Button, GeminiMark } from './Kit';

interface Props {
  mode: 'predefined' | 'custom';
  onMode: (mode: 'predefined' | 'custom') => void;
  presetId: string;
  onPreset: (id: string) => void;
  params: PersonaParameters;
  onParams: (p: PersonaParameters) => void;
  generated: string;
  generating: boolean;
  onGenerate: () => void;
  locked: boolean;
  sample: boolean;
}

/** A generated persona is one paragraph and up to three "- " bullets. */
export function PersonaText({ text }: { text: string }) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bullets = lines.filter((l) => /^[-•*]\s+/.test(l)).map((l) => l.replace(/^[-•*]\s+/, ''));
  const prose = lines.filter((l) => !/^[-•*]\s+/.test(l)).join(' ');
  return (
    <div className="persona-text">
      {prose}
      {bullets.length > 0 && <ul>{bullets.map((b) => <li key={b}>{b}</li>)}</ul>}
    </div>
  );
}

export function PersonaStep(p: Props) {
  const ready = parametersReady(p.params);
  const preset = PREDEFINED_PERSONAS.find((x) => x.id === p.presetId);

  return (
    <div className="cast">
      <div className="plate pad">
        <div className="tabs" role="tablist" aria-label="Persona source">
          <button type="button" role="tab" className="plate tab" aria-selected={p.mode === 'predefined'} disabled={p.locked} onClick={() => p.onMode('predefined')}>Pre-defined Personas</button>
          <button type="button" role="tab" className="plate tab" aria-selected={p.mode === 'custom'} disabled={p.locked} onClick={() => p.onMode('custom')}>Custom Parameters</button>
        </div>

        {p.mode === 'predefined' ? (
          <div className="presets" role="radiogroup" aria-label="Pre-defined persona">
            {PREDEFINED_PERSONAS.map((x) => (
              <button key={x.id} type="button" role="radio" className="plate preset" aria-checked={p.presetId === x.id} disabled={p.locked} onClick={() => p.onPreset(x.id)}>
                <b>{x.label}</b>
                <span>{x.note}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="pixel" style={{ fontSize: 13, marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              Create Persona {ready && <span className="tag gap">Ready</span>}
            </p>
            {PARAMETERS.map((param) => (
              <div className="param" key={param.key}>
                <span className="param-title" id={`param-${param.key}`}>{param.title}</span>
                <div className="choices" role="radiogroup" aria-labelledby={`param-${param.key}`}>
                  {param.options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      className="plate choice"
                      title={o.note}
                      aria-checked={p.params[param.key] === o.id}
                      disabled={p.locked}
                      onClick={() => p.onParams({ ...p.params, [param.key]: o.id })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="param">
              <label className="param-title" htmlFor="details">Additional Details</label>
              <input id="details" className="field" style={{ minHeight: 40, padding: '8px 12px', fontSize: 14 }} placeholder="Optional: anything else about them" value={p.params.customDetails} disabled={p.locked} onChange={(e) => p.onParams({ ...p.params, customDetails: e.target.value })} />
            </div>
            <div style={{ marginTop: 16 }}>
              <Button wide disabled={!ready || p.generating || p.locked} onClick={p.onGenerate}>{p.generating ? 'Generating persona…' : 'Generate Custom Persona'}</Button>
            </div>
          </>
        )}
      </div>

      <div className="plate pad persona-panel" aria-live="polite">
        <p className="pixel" style={{ fontSize: 13, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          {p.mode === 'custom' ? 'Generated Persona' : 'Persona'}
          {p.mode === 'custom' && !p.sample && <GeminiMark />}
        </p>
        <div className="grow">
          {p.mode === 'predefined' ? (
            <div className="persona-text">{preset?.text}</div>
          ) : p.generating ? (
            <p className="muted">Generating persona…</p>
          ) : p.generated ? (
            <PersonaText text={p.generated} />
          ) : (
            <p className="muted">{ready ? 'Ready. Generate the persona to see who you are testing with.' : 'Waiting for parameter selection...'}</p>
          )}
        </div>
        {p.mode === 'custom' && p.generated && !p.generating && (
          <div style={{ marginTop: 18 }}>
            <Button variant="ghost" size="small" disabled={p.locked} onClick={p.onGenerate}>Regenerate</Button>
          </div>
        )}
        {p.sample && p.mode === 'custom' && <p className="help muted" style={{ fontSize: 13, marginTop: 14 }}>Sample mode: this persona is pre-written, not generated.</p>}
      </div>
    </div>
  );
}
