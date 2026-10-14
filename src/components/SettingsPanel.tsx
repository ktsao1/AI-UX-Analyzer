import { useEffect, useRef, useState } from 'react';
import { clearSettings, DEFAULT_MODEL, saveSettings, type Settings } from '../services/settings';
import { Button } from './Kit';

export function SettingsPanel({ settings, onClose, onSave }: { settings: Settings; onClose: () => void; onSave: (s: Settings) => void }) {
  const [draft, setDraft] = useState(settings);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const set = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft({ ...draft, [key]: e.target.value.trim() });

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form
        className="plate pad dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onSubmit={(e) => {
          e.preventDefault();
          const next = { ...draft, model: draft.model || DEFAULT_MODEL };
          saveSettings(next);
          onSave(next);
        }}
      >
        <h2 id="settings-title">Settings</h2>
        <p className="help">
          To test your own prototype the tool needs to read your Figma file and call Gemini. Both keys stay in this browser
          (localStorage) and are sent only to Figma and Google. The sample prototype needs neither.
        </p>
        <label>
          <span className="label">Gemini API key</span>
          <input ref={first} className="field" type="password" autoComplete="off" spellCheck={false} value={draft.geminiKey} onChange={set('geminiKey')} placeholder="AIza…" />
          <span className="help">Create one at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.</span>
        </label>
        <label>
          <span className="label">Figma personal access token</span>
          <input className="field" type="password" autoComplete="off" spellCheck={false} value={draft.figmaToken} onChange={set('figmaToken')} placeholder="figd_…" />
          <span className="help">Figma → Settings → Security → Personal access tokens. It needs read access to file content.</span>
        </label>
        <label>
          <span className="label">Gemini model</span>
          <input className="field" type="text" autoComplete="off" spellCheck={false} value={draft.model} onChange={set('model')} placeholder={DEFAULT_MODEL} />
          <span className="help">Any Gemini model that accepts images. Default: {DEFAULT_MODEL}.</span>
        </label>
        <div className="row">
          <Button
            variant="ghost"
            onClick={() => {
              clearSettings();
              onSave({ geminiKey: '', figmaToken: '', model: DEFAULT_MODEL });
            }}
          >
            Forget keys
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </div>
  );
}
