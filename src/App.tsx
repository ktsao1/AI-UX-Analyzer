import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Chapter, Progress, StepNav } from './components/Kit';
import { LinkStep } from './components/LinkStep';
import { PersonaStep } from './components/PersonaStep';
import { Results } from './components/Results';
import { RunView, type LiveScreen } from './components/RunView';
import { SettingsPanel } from './components/SettingsPanel';
import { TopBar, type Engines } from './components/TopBar';
import { DEMO_PROTOTYPE, demoImageUrl, demoScreens } from './demo/prototype';
import { createDemoModel, DEMO_CHALLENGE } from './demo/script';
import { parseFigmaUrl } from './lib/figmaUrl';
import { EMPTY_PARAMETERS, labelOf, nameIn, parametersReady, patienceFor, PREDEFINED_PERSONAS } from './lib/personas';
import { personaPrompt } from './lib/prompts';
import { runAnalysis } from './lib/runner';
import type { ModelClient, Persona, PersonaParameters, Prototype, RunResult, ScreenSource, Step } from './lib/types';
import { createFigmaScreens, fetchPrototype } from './services/figma';
import { createGeminiModel } from './services/gemini';
import { loadSettings, type Settings } from './services/settings';

type Phase = 'setup' | 'running' | 'done';

/** Setup is a wizard, one step on screen at a time, so nobody scrolls past a
 *  step they had to fill in. */
const SETUP_STEPS = ['Link prototype', 'Cast tester', 'Give a task'];

const SAMPLE_PARAMETERS: PersonaParameters = { age: '65+', gender: 'female', employmentStatus: 'retired', techSavviness: 'beginner', income: 'middle', customDetails: 'wears reading glasses, new to smartphones' };
const MAX_RUNS = 10;

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Engines>({ figma: false, gemini: false });

  // 01: the prototype
  const [url, setUrl] = useState('');
  const [fetching, setFetching] = useState(false);
  const [sample, setSample] = useState(false);
  const [prototype, setPrototype] = useState<Prototype | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [flowIndex, setFlowIndex] = useState<number | null>(null);
  const screensRef = useRef<ScreenSource | null>(null);
  const demoModel = useRef<ModelClient | null>(null);

  // 02: the tester
  const [personaMode, setPersonaMode] = useState<'predefined' | 'custom'>('predefined');
  const [presetId, setPresetId] = useState(PREDEFINED_PERSONAS[0].id);
  const [params, setParams] = useState<PersonaParameters>(EMPTY_PARAMETERS);
  const [generated, setGenerated] = useState('');
  const [generating, setGenerating] = useState(false);

  // 03: the task
  const [challenge, setChallenge] = useState(DEMO_CHALLENGE);
  const [runCount, setRunCount] = useState(1);

  // The run and its results
  const [phase, setPhase] = useState<Phase>('setup');
  const [setupStep, setSetupStep] = useState(0);
  const stepMoved = useRef(false);
  const [runIndex, setRunIndex] = useState(0);
  const [liveSteps, setLiveSteps] = useState<Step[]>([]);
  const [liveScreen, setLiveScreen] = useState<LiveScreen | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<RunResult[]>([]);
  const [selected, setSelected] = useState(0);
  const [fast, setFast] = useState(false);
  const fastRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const hasKeys = Boolean(settings.geminiKey && settings.figmaToken);

  /** The model for this session, wrapped so the top bar can show when it is
   *  being called. */
  const model = useMemo<ModelClient | null>(() => {
    const inner = sample ? (demoModel.current ??= createDemoModel()) : settings.geminiKey ? createGeminiModel(settings.geminiKey, settings.model) : null;
    if (!inner) return null;
    return {
      async generate(request) {
        setBusy((b) => ({ ...b, gemini: true }));
        try {
          return await inner.generate(request);
        } finally {
          setBusy((b) => ({ ...b, gemini: false }));
        }
      },
    };
  }, [sample, settings.geminiKey, settings.model]);

  const persona = useMemo<Persona | null>(() => {
    if (personaMode === 'predefined') {
      const preset = PREDEFINED_PERSONAS.find((p) => p.id === presetId)!;
      return { label: preset.label, text: preset.text, patience: preset.patience, tags: preset.tags };
    }
    if (!generated) return null;
    return {
      label: nameIn(generated) ?? 'Custom persona',
      text: generated,
      patience: patienceFor(params),
      tags: [labelOf('age', params.age), labelOf('employmentStatus', params.employmentStatus), labelOf('techSavviness', params.techSavviness)],
    };
  }, [personaMode, presetId, generated, params]);

  const resetRun = () => {
    abortRef.current?.abort();
    setPhase('setup');
    setResults([]);
    setLiveSteps([]);
    setLiveScreen(null);
    setAnalysing(false);
    setSelected(0);
  };

  const resetAll = () => {
    resetRun();
    setPrototype(null);
    setThumbs({});
    setFlowIndex(null);
    setSample(false);
    setError(null);
    setSetupStep(0);
    screensRef.current = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadSample = () => {
    resetRun();
    setError(null);
    setSample(true);
    demoModel.current = createDemoModel();
    screensRef.current = demoScreens;
    setPrototype(DEMO_PROTOTYPE);
    setThumbs(Object.fromEntries(Object.keys(DEMO_PROTOTYPE.screens).map((id) => [id, demoImageUrl(id)])));
    setFlowIndex(0);
    setChallenge(DEMO_CHALLENGE);
    setPersonaMode('custom');
    setParams(SAMPLE_PARAMETERS);
    setGenerated('');
    setRunCount(3);
  };

  const fetchFigma = async () => {
    setError(null);
    const link = parseFigmaUrl(url);
    if (!link) {
      setError('That does not look like a Figma frame link. Copy it from Figma with a frame selected: it should contain a file key and a node-id.');
      return;
    }
    if (!settings.figmaToken || !settings.geminiKey) {
      setError('Add a Figma token and a Gemini API key in Settings first, or try the sample prototype.');
      setShowSettings(true);
      return;
    }
    resetRun();
    setSample(false);
    setPrototype(null);
    setFetching(true);
    setBusy((b) => ({ ...b, figma: true }));
    try {
      const loaded = await fetchPrototype(link.fileKey, settings.figmaToken);
      const inner = createFigmaScreens(link.fileKey, settings.figmaToken);
      // Light the Figma chip whenever a screen is being fetched mid-run.
      screensRef.current = {
        async getImage(id, signal) {
          setBusy((b) => ({ ...b, figma: true }));
          try {
            return await inner.getImage(id, signal);
          } finally {
            setBusy((b) => ({ ...b, figma: false }));
          }
        },
      };
      setPrototype(loaded);
      // Start on the flow that begins at the linked frame, if there is one.
      const linked = loaded.flows.findIndex((f) => f.startId === link.nodeId);
      setFlowIndex(linked >= 0 ? linked : loaded.flows.length === 1 ? 0 : null);
      setThumbs({});
      const ids = Object.keys(loaded.screens).slice(0, 40);
      if (ids.length) setThumbs(await inner.prefetch(ids));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read that Figma file.');
    } finally {
      setFetching(false);
      setBusy((b) => ({ ...b, figma: false }));
    }
  };

  const generatePersona = async () => {
    if (!model || !parametersReady(params)) return;
    setError(null);
    setGenerating(true);
    try {
      const text = await model.generate({ kind: 'persona', prompt: personaPrompt(params) });
      setGenerated(text.replace(/\*\*/g, '').trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate the persona.');
    } finally {
      setGenerating(false);
    }
  };

  const flow = prototype && flowIndex !== null ? prototype.flows[flowIndex] : null;
  const canRun = Boolean(prototype && flow && persona && model && challenge.trim());

  // The furthest step the visitor may go to: the task needs a persona, and
  // the persona needs a flow to test.
  const reachable = !flow ? 0 : !persona ? 1 : 2;
  const goToStep = (index: number) => {
    setError(null);
    stepMoved.current = true;
    setSetupStep(Math.min(index, reachable));
  };

  // A new step starts at the top of the page, with focus on its heading so a
  // screen reader hears where it landed.
  useEffect(() => {
    if (!stepMoved.current) return;
    stepMoved.current = false;
    window.scrollTo({ top: 0 });
    document.getElementById(`${['link', 'cast', 'task'][setupStep]}-title`)?.focus({ preventScroll: true });
  }, [setupStep]);

  const start = useCallback(async () => {
    if (!prototype || !flow || !persona || !model || !screensRef.current) return;
    setError(null);
    setResults([]);
    setSelected(0);
    setPhase('running');
    window.scrollTo({ top: 0 });
    setFast(false);
    fastRef.current = false;
    const controller = new AbortController();
    abortRef.current = controller;
    const collected: RunResult[] = [];

    for (let i = 0; i < runCount; i++) {
      if (controller.signal.aborted) break;
      setRunIndex(i);
      setLiveSteps([]);
      setLiveScreen(null);
      setAnalysing(false);
      const startedAt = Date.now();
      let held = 0;
      let holding = 0;
      setElapsed(0);
      // The clock stops while a step is held on screen to be read, as the
      // run's own timing does.
      const clock = setInterval(() => !holding && setElapsed(Date.now() - startedAt - held), 250);
      const result = await runAnalysis({
        prototype,
        startId: flow.startId,
        persona,
        challenge: challenge.trim(),
        model,
        screens: screensRef.current,
        runIndex: i,
        signal: controller.signal,
        onProgress: async (event) => {
          if (event.kind === 'screen') setLiveScreen({ stepNumber: event.stepNumber, screenName: event.screenName, imageUrl: event.imageUrl });
          else if (event.kind === 'analysing') {
            clearInterval(clock);
            setAnalysing(true);
          } else {
            setLiveSteps(event.steps);
            // Hold the step on screen long enough to be read: the time it
            // takes to type out, and a beat to take in the decision.
            const hold = (event.step.thought.length / 80) * 1000 + 1600;
            holding = Date.now();
            const until = holding + hold;
            while (Date.now() < until && !fastRef.current && !controller.signal.aborted) await new Promise((r) => setTimeout(r, 80));
            held += Date.now() - holding;
            holding = 0;
          }
        },
      });
      clearInterval(clock);
      collected.push(result);
      setResults([...collected]);
      if (result.status === 'error') {
        setError(`Run ${i + 1} stopped: ${result.note}`);
        break;
      }
      if (result.status === 'cancelled') break;
    }

    setAnalysing(false);
    const useful = collected.filter((r) => r.steps.length > 0);
    setResults(useful);
    setPhase(useful.length ? 'done' : 'setup');
  }, [prototype, flow, persona, model, challenge, runCount]);

  useEffect(() => {
    if (phase === 'done') resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [phase]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const locked = phase === 'running';

  return (
    <div className="page">
      <TopBar busy={busy} sample={sample} model={settings.model} onSettings={() => setShowSettings(true)} onHome={resetAll} />

      <main>
        {!prototype && (
          <div className="hero">
            <h1>AI Usability Analyzer</h1>
            <p>Simulated user testing for Figma prototypes</p>
          </div>
        )}

        {error && <p className="plate flat error" role="alert">{error}</p>}

        {phase === 'setup' && <Progress steps={SETUP_STEPS} current={setupStep} reachable={reachable} onStep={goToStep} />}

        {phase === 'setup' && setupStep === 0 && (
          <Chapter id="link" number="01" title="Link your prototype" sub="Paste a Figma frame. The tool reads every screen and how they connect.">
            <LinkStep
              url={url}
              onUrl={setUrl}
              onFetch={fetchFigma}
              onSample={loadSample}
              onSettings={() => setShowSettings(true)}
              fetching={fetching}
              hasKeys={hasKeys}
              locked={locked}
              prototype={prototype}
              sample={sample}
              thumbs={thumbs}
              flowIndex={flowIndex}
              onFlow={setFlowIndex}
            />
            {prototype && (
              <StepNav
                onNext={() => goToStep(1)}
                canNext={Boolean(flow)}
                hint={!flow && prototype.flows.length > 0 && 'Select a prototype flow to continue.'}
              />
            )}
          </Chapter>
        )}

        {prototype && prototype.flows.length > 0 && phase === 'setup' && setupStep === 1 && (
            <Chapter id="cast" number="02" title="Cast your tester" sub="Pick a ready-made persona, or build one of your own.">
              <PersonaStep
                mode={personaMode}
                onMode={setPersonaMode}
                presetId={presetId}
                onPreset={setPresetId}
                params={params}
                onParams={(next) => {
                  setParams(next);
                }}
                generated={generated}
                generating={generating}
                onGenerate={generatePersona}
                locked={locked}
                sample={sample}
              />
              <StepNav
                onBack={() => goToStep(0)}
                onNext={() => goToStep(2)}
                canNext={Boolean(persona)}
                hint={!persona && (generating ? 'Generating the persona…' : 'Generate the persona to continue.')}
              />
            </Chapter>
        )}

        {prototype && prototype.flows.length > 0 && phase === 'setup' && setupStep === 2 && (
            <Chapter id="task" number="03" title="Give it a task" sub="Then watch it try, one screen at a time.">
              <div className="plate pad task">
                <label style={{ display: 'grid', gap: 8 }}>
                  <span className="label">Challenge Prompt</span>
                  <textarea className="field" rows={2} value={challenge} onChange={(e) => setChallenge(e.target.value)} placeholder="For example: Find and edit your user profile." />
                </label>
                <div className="runs-row">
                  <span className="label" id="runs-label">Number of Analysis Runs</span>
                  <div className="stepper" role="group" aria-labelledby="runs-label">
                    <Button variant="ghost" size="small" aria-label="Fewer runs" disabled={runCount <= 1} onClick={() => setRunCount((n) => Math.max(1, n - 1))}>−</Button>
                    <output className="plate" aria-live="polite">{runCount}</output>
                    <Button variant="ghost" size="small" aria-label="More runs" disabled={runCount >= MAX_RUNS} onClick={() => setRunCount((n) => Math.min(MAX_RUNS, n + 1))}>+</Button>
                  </div>
                </div>
                <Button wide disabled={!canRun} onClick={start}>Run {runCount} Analysis {runCount === 1 ? 'Pass' : 'Passes'}</Button>
                {!canRun && (
                  <p className="muted" style={{ fontSize: 14, textAlign: 'center' }}>
                    {!flow ? 'Go back and select a prototype flow.' : !persona ? 'Go back and generate the persona first.' : !challenge.trim() ? 'Write a challenge for the persona.' : 'Add a Gemini API key in Settings.'}
                  </p>
                )}
                {sample && <p className="notice">Sample mode replays a pre-written session for the sample persona, so the words do not change with the persona or challenge you pick. Add your keys in Settings to test for real.</p>}
              </div>
              <StepNav onBack={() => goToStep(1)} />
            </Chapter>
        )}

        {phase === 'running' && persona && (
          <Chapter id="run" number="03" title="Give it a task" sub="The persona sees one screen at a time and thinks aloud.">
            <RunView
              persona={persona}
              challenge={challenge}
              runIndex={runIndex}
              runCount={runCount}
              elapsedMs={elapsed}
              steps={liveSteps}
              screen={liveScreen}
              analysing={analysing}
              sample={sample}
              fast={fast}
              onFastForward={() => {
                fastRef.current = true;
                setFast(true);
              }}
              onCancel={() => abortRef.current?.abort()}
            />
          </Chapter>
        )}

        {phase === 'done' && persona && results.length > 0 && (
          <div ref={resultsRef}>
            <Chapter id="results" number="04" title="Read the results" sub="Every run ends in a report.">
              <Results
                results={results}
                persona={persona}
                challenge={challenge}
                selected={selected}
                onSelect={setSelected}
                sample={sample}
                onAgain={() => {
                  resetRun();
                  window.scrollTo({ top: 0 });
                }}
                onReset={resetAll}
              />
            </Chapter>
          </div>
        )}
      </main>

      <footer className="foot">
        <span>Built with Figma's REST API and Google Gemini.</span>
        <a href="https://github.com/ktsao1/AI-UX-Analyzer" style={{ color: 'inherit' }}>Source on GitHub</a>
      </footer>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={(next) => {
            setSettings(next);
            setShowSettings(false);
            setError(null);
          }}
        />
      )}
    </div>
  );
}
