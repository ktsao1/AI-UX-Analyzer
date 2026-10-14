import { matchHotspot, tapPoint } from './matching';
import { parseDecision, thoughtOf } from './parsing';
import { PATIENCE } from './personas';
import { analysisPrompt, stepPrompt } from './prompts';
import { parseSus } from './sus';
import type { ModelClient, Persona, Prototype, RunResult, ScreenSource, Step, StepOutcome } from './types';

export interface RunInput {
  prototype: Prototype;
  startId: string;
  persona: Persona;
  challenge: string;
  model: ModelClient;
  screens: ScreenSource;
  runIndex: number;
  signal?: AbortSignal;
  /** Called as the run moves, so the page can follow it live. A promise
   *  returned for a `step` event is waited on before the next screen, which
   *  is how the page holds each step long enough to be read. */
  onProgress?: (event: RunEvent) => void | Promise<void>;
}

export type RunEvent =
  | { kind: 'screen'; stepNumber: number; screenId: string; screenName: string; imageUrl: string }
  | { kind: 'step'; step: Step; steps: Step[] }
  | { kind: 'analysing' };

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

const check = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new CancelledError();
};

/** One pass of the test: the persona is shown the flow's first screen, says
 *  what it thinks and names what it would tap; that element is looked up in
 *  the prototype and its link followed; and so on until the persona sees the
 *  task is done or runs out of patience.
 *
 *  Every screen shown counts as a step, including a second look at a screen
 *  where the last tap did nothing, so `maxSteps` always bounds the run. A
 *  tap that leads somewhere clears the count of dead ends; reaching the
 *  persona's limit of dead ends in a row ends the run.
 *
 *  Only a completed run is scored: a persona that gave up has not used
 *  enough of the system to answer a usability questionnaire about it. */
export async function runAnalysis(input: RunInput): Promise<RunResult> {
  const { prototype, persona, challenge, model, screens, runIndex, signal, onProgress } = input;
  const rule = PATIENCE[persona.patience];
  const started = Date.now();
  const steps: Step[] = [];
  const backStack: string[] = [];
  let currentId = input.startId;
  let failures = 0;
  let feedback: string | undefined;
  let status: RunResult['status'] = 'gave-up';
  let note: string | undefined;

  // Time the page spends holding a step on screen for the reader is not
  // time the persona spent on the task, so it is kept off the clock.
  let held = 0;
  const finish = (extra: Partial<RunResult> = {}): RunResult => ({ index: runIndex, status, steps, durationMs: Date.now() - started - held, note, ...extra });

  try {
    for (let stepNumber = 1; stepNumber <= rule.maxSteps; stepNumber++) {
      check(signal);
      const screen = prototype.screens[currentId];
      if (!screen) throw new Error(`The prototype has no screen with id ${currentId}.`);

      const image = await screens.getImage(screen.id, signal);
      check(signal);
      onProgress?.({ kind: 'screen', stepNumber, screenId: screen.id, screenName: screen.name, imageUrl: image.url });

      const raw = await model.generate({
        kind: 'step',
        prompt: stepPrompt({
          persona: persona.text,
          challenge,
          patience: persona.patience,
          screenName: screen.name,
          stepNumber,
          history: steps,
          feedback,
          canGoBack: backStack.length > 0,
          deadEnd: screen.hotspots.length === 0,
        }),
        image,
        runIndex,
        stepNumber,
        screenId: screen.id,
        signal,
      });
      check(signal);

      const decision = parseDecision(raw);
      let outcome: StepOutcome;
      let tap: Step['tap'];
      feedback = undefined;

      const goBack = () => {
        const previous = backStack.pop();
        if (!previous) return false;
        currentId = previous;
        outcome = { kind: 'back', toScreenId: previous, toName: prototype.screens[previous]?.name ?? 'the previous screen' };
        failures = 0;
        return true;
      };

      if (decision.complete) {
        outcome = { kind: 'complete' };
      } else if (decision.goBack) {
        if (!goBack()) {
          outcome = { kind: 'nowhere-back' };
          failures++;
          feedback = 'You tried to go back, but this is the first screen: there is nowhere to go back to.';
        }
      } else if (!decision.component) {
        outcome = { kind: 'no-action' };
        failures++;
        feedback = 'Last time you did not settle on anything to tap. Pick one thing on the screen.';
      } else {
        const match = matchHotspot(screen, decision.component, decision.location);
        if (match.kind === 'match') {
          tap = tapPoint(match.hotspot, screen);
          if (match.hotspot.target.kind === 'back') {
            if (!goBack()) {
              outcome = { kind: 'nowhere-back' };
              failures++;
              feedback = `You tapped "${decision.component}", but there was nowhere to go back to.`;
            }
          } else {
            const toId = match.hotspot.target.screenId;
            backStack.push(currentId);
            currentId = toId;
            outcome = { kind: 'navigated', toScreenId: toId, toName: prototype.screens[toId]?.name ?? 'the next screen', hotspotName: match.hotspot.name };
            failures = 0;
          }
        } else {
          outcome = match.kind === 'design-gap' ? { kind: 'design-gap', component: decision.component } : { kind: 'no-match', component: decision.component };
          failures++;
          feedback = `You tapped "${decision.component}" and nothing happened. You are still on the same screen${failures > 1 ? `, and that is ${failures} dead ends in a row` : ''}. Look again with fresh eyes and try something you have not tried, or go back.`;
        }
      }

      const step: Step = { number: stepNumber, screenId: screen.id, screenName: screen.name, imageUrl: image.url, thought: thoughtOf(raw), raw, decision, outcome: outcome!, tap };
      steps.push(step);
      const holdFrom = Date.now();
      await onProgress?.({ kind: 'step', step, steps: [...steps] });
      held += Date.now() - holdFrom;
      check(signal);

      if (outcome!.kind === 'complete') {
        status = 'completed';
        break;
      }
      if (failures >= rule.maxFailures) break;
    }
  } catch (error) {
    if (error instanceof CancelledError || signal?.aborted) {
      status = 'cancelled';
      return finish({ note: 'Cancelled.' });
    }
    status = 'error';
    return finish({ note: error instanceof Error ? error.message : 'Something went wrong.' });
  }

  if (status !== 'completed') {
    note = rule.giveUp;
    return finish({ sus: null });
  }

  // The clock stops when the task does; the write-up is not part of the
  // persona's time on task.
  const durationMs = Date.now() - started - held;
  try {
    onProgress?.({ kind: 'analysing' });
    const analysis = await model.generate({ kind: 'analysis', prompt: analysisPrompt({ persona: persona.text, challenge, steps }), runIndex, signal });
    check(signal);
    return finish({ durationMs, analysis, sus: parseSus(analysis) });
  } catch (error) {
    if (error instanceof CancelledError || signal?.aborted) return finish({ durationMs, sus: null, note: 'The task was completed; the analysis was cancelled.' });
    return finish({ durationMs, sus: null, note: `The task was completed, but the analysis failed: ${error instanceof Error ? error.message : 'unknown error'}` });
  }
}
