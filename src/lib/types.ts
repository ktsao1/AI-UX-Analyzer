export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Something on a screen that the prototype has wired to go somewhere. */
export interface Hotspot {
  id: string;
  /** The layer's name in the design file. */
  name: string;
  /** Lower-case words the model might call it by: the layer name and any
   *  text inside it. */
  keywords: string[];
  /** True when it has readable text of its own (a button, a list row), false
   *  for a bare icon or picture. */
  labelled?: boolean;
  /** Where it sits, in the same coordinate space as its screen's `box`. */
  box?: Rect;
  /** The screen it leads to, or `back` for a "go back" action. */
  target: { kind: 'screen'; screenId: string } | { kind: 'back' };
}

export interface Screen {
  id: string;
  name: string;
  box?: Rect;
  hotspots: Hotspot[];
}

export interface Flow {
  name: string;
  startId: string;
}

/** A prototype as the analyzer sees it: screens joined by hotspots. A graph,
 *  not a tree, because real prototypes loop back on themselves. */
export interface Prototype {
  name: string;
  screens: Record<string, Screen>;
  flows: Flow[];
}

export type GridCell =
  | 'top-left' | 'top-center' | 'top-right'
  | 'center-left' | 'center' | 'center-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

export type PatienceLevel = 'low' | 'medium' | 'high';

export interface PersonaParameters {
  age: string;
  gender: string;
  employmentStatus: string;
  techSavviness: string;
  income: string;
  customDetails: string;
}

/** Who is taking the test. `text` is what the model is told to be. */
export interface Persona {
  label: string;
  text: string;
  patience: PatienceLevel;
  tags: string[];
}

/** What the model decided on one screen, read out of its reply. */
export interface Decision {
  component: string | null;
  location: GridCell | null;
  goBack: boolean;
  complete: boolean;
}

export type StepOutcome =
  | { kind: 'navigated'; toScreenId: string; toName: string; hotspotName: string }
  | { kind: 'back'; toScreenId: string; toName: string }
  | { kind: 'complete' }
  | { kind: 'design-gap'; component: string }
  | { kind: 'no-match'; component: string }
  | { kind: 'no-action' }
  | { kind: 'nowhere-back' };

export interface Step {
  number: number;
  screenId: string;
  screenName: string;
  imageUrl: string;
  /** The persona thinking aloud, with the machine-readable lines removed. */
  thought: string;
  /** The model's whole reply, kept for the usability analysis. */
  raw: string;
  decision: Decision;
  outcome: StepOutcome;
  /** Centre of the tap, as a percentage of the screen, when the element was
   *  found in the prototype. */
  tap?: { x: number; y: number };
}

export interface SusResult {
  /** Ten answers, 1 to 5, in the scale's order. */
  answers: number[];
  score: number;
}

export type RunStatus = 'completed' | 'gave-up' | 'cancelled' | 'error';

export interface RunResult {
  index: number;
  status: RunStatus;
  steps: Step[];
  durationMs: number;
  /** Why the run stopped, in the persona's or the tool's words. */
  note?: string;
  /** Only a completed run is scored. */
  sus?: SusResult | null;
  /** The written usability analysis, as markdown. */
  analysis?: string;
}

export type ModelRequest =
  | { kind: 'persona'; prompt: string; signal?: AbortSignal }
  | { kind: 'step'; prompt: string; image: ScreenImage; runIndex: number; stepNumber: number; screenId: string; signal?: AbortSignal }
  | { kind: 'analysis'; prompt: string; runIndex: number; signal?: AbortSignal };

/** The language model, behind one method so the run loop does not care
 *  whether it is talking to Gemini or to the sample script. */
export interface ModelClient {
  generate(request: ModelRequest): Promise<string>;
}

export interface ScreenImage {
  url: string;
  base64?: string;
  mimeType?: string;
}

/** Where screen pictures come from: Figma's image API, or the bundled
 *  sample. */
export interface ScreenSource {
  getImage(screenId: string, signal?: AbortSignal): Promise<ScreenImage>;
}
