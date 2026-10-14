import { Fragment } from 'react';
import { formatDuration, stepAction } from '../lib/summary';
import type { Persona, Step } from '../lib/types';
import { Button, Dots, GeminiMark, useTyped } from './Kit';
import { PhoneScreen } from './PhoneScreen';

export interface LiveScreen {
  stepNumber: number;
  screenName: string;
  imageUrl: string;
}

interface Props {
  persona: Persona;
  challenge: string;
  runIndex: number;
  runCount: number;
  elapsedMs: number;
  steps: Step[];
  screen: LiveScreen | null;
  analysing: boolean;
  sample: boolean;
  onCancel: () => void;
  onFastForward: () => void;
  fast: boolean;
}

/** Mark the words in the thought that became the action. */
function Thought({ text, component, typing }: { text: string; component: string | null; typing: boolean }) {
  const index = component ? text.toLowerCase().indexOf(component.toLowerCase()) : -1;
  return (
    <p className="thought">
      {index >= 0 && !typing ? (
        <>{text.slice(0, index)}<mark>{text.slice(index, index + component!.length)}</mark>{text.slice(index + component!.length)}</>
      ) : text}
      {typing && <span className="caret" aria-hidden="true" />}
    </p>
  );
}

export function Sheet({ persona, challenge, children }: { persona: Persona; challenge: string; children?: React.ReactNode }) {
  return (
    <aside className="plate pad sheet">
      <span className="label">Persona</span>
      <h3>{persona.label}</h3>
      <div className="tags">{persona.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
      <hr className="rule" />
      <span className="label">Challenge Prompt</span>
      <p className="challenge">{challenge}</p>
      {children}
    </aside>
  );
}

export function Journey({ steps }: { steps: Step[] }) {
  return (
    <ol className="journey">
      {steps.map((s) => (
        <li key={s.number}>
          <span className={`badge${s.outcome.kind === 'complete' ? ' done' : ''}`}>{s.outcome.kind === 'complete' ? '✓' : s.number}</span>
          <b>{s.screenName}</b>
          <span className="arrow" aria-hidden="true">›</span>
          <span className="act">{stepAction(s)}</span>
          {s.outcome.kind === 'design-gap' && <span className="tag gap">Gap</span>}
        </li>
      ))}
    </ol>
  );
}

export function outcomeText(step: Step): string {
  const o = step.outcome;
  switch (o.kind) {
    case 'navigated': return `Found “${o.hotspotName}” in the prototype and followed it to “${o.toName}”.`;
    case 'back': return `Went back to “${o.toName}”.`;
    case 'complete': return 'The persona saw proof on screen and called the task complete.';
    case 'design-gap': return `Design gap: “${o.component}” was expected but has no interaction wired up in the prototype.`;
    case 'no-match': return `“${o.component}” could fit more than one element in the prototype, so no tap was made.`;
    case 'no-action': return 'The persona did not choose anything to tap.';
    case 'nowhere-back': return 'The persona tried to go back from the first screen.';
  }
}

export function RunView(p: Props) {
  const last = p.steps[p.steps.length - 1];
  // The reply for the screen on show, once it has arrived.
  const step = last && p.screen && last.number === p.screen.stepNumber ? last : undefined;
  const { shown, done } = useTyped(step?.thought ?? '', p.fast ? 2000 : 80);
  return (
    <div>
      <div className="run">
        <Sheet persona={p.persona} challenge={p.challenge}>
          <hr className="rule" />
          <div className="status" role="status" data-busy="true">
            <Dots />
            <span>{p.analysing ? 'Writing the usability analysis…' : `Running analysis ${p.runIndex + 1} of ${p.runCount}...`}</span>
          </div>
          <p className="label clock">Time: {formatDuration(p.elapsedMs)}</p>
          <hr className="rule" />
          <span className="label">Journey</span>
          <Journey steps={p.steps} />
        </Sheet>

        <PhoneScreen
          src={p.screen?.imageUrl}
          alt={p.screen ? `Prototype screen: ${p.screen.screenName}` : ''}
          cell={step && done ? step.decision.location : null}
          tap={step && done ? step.tap : undefined}
        />

        <div className="talk">
          <div className="plate pad bubble">
            <span className="bubble-tail" aria-hidden="true" />
            <div className="bubble-head">
              <span className="badge">{p.screen?.stepNumber ?? 1}</span>
              <div>
                <span className="label">Thought Process</span>
                <b>{p.screen?.screenName ?? 'Loading screen'}</b>
              </div>
            </div>
            {step ? (
              <>
                <Thought text={shown} component={step.decision.component} typing={!done} />
                <span className="sr-only" role="status">{step.thought}</span>
              </>
            ) : (
              <p className="thought muted">{p.screen ? 'Looking at the screen' : 'Fetching the screen'}<span className="caret" aria-hidden="true" /></p>
            )}
          </div>

          <div className="plate ink pad on-ink">
            <div className="decision-head">
              <b>AI's Decision</b>
              {!p.sample && <GeminiMark size={20} />}
            </div>
            {[
              ['Identified Action Component', step && done ? (step.decision.component ? `“${step.decision.component}”` : 'None') : '', true],
              ['Identified Action Location', step && done ? (step.decision.location ?? 'None') : '', false],
              ['Identified Task Completion', step && done ? (step.decision.complete ? 'YES' : 'NO') : '', false],
            ].map(([label, value, key]) => (
              <Fragment key={label as string}>
                <div className="decision-row">
                  <span className="label">{label}</span>
                  {value && <p className={`fade-in${key || value === 'YES' ? ' key' : ''}`}>{value}</p>}
                </div>
              </Fragment>
            ))}
          </div>

          {step && done && step.outcome.kind !== 'navigated' && step.outcome.kind !== 'complete' && (
            <div className="plate gap-flag fade-in">
              {step.outcome.kind === 'design-gap' && <span className="label">Expected but missing UI element</span>}
              {outcomeText(step)}
            </div>
          )}
        </div>
      </div>

      <div className="run-foot actions">
        {!p.fast && <Button variant="ghost" onClick={p.onFastForward}>Fast forward</Button>}
        <Button variant="ghost" onClick={p.onCancel}>Cancel analysis</Button>
      </div>
    </div>
  );
}
