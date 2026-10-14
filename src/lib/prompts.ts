import { labelOf, PATIENCE } from './personas';
import { SUS_STATEMENTS } from './sus';
import type { PatienceLevel, PersonaParameters, Step } from './types';

export function personaPrompt(p: PersonaParameters): string {
  return `You are a UX researcher creating a user persona for usability testing. Write the persona from these parameters:

Age range: ${labelOf('age', p.age)}
Gender: ${labelOf('gender', p.gender)}
Employment status: ${labelOf('employmentStatus', p.employmentStatus)}
Tech savviness: ${labelOf('techSavviness', p.techSavviness)}
Income level: ${labelOf('income', p.income)}
${p.customDetails.trim() ? `Additional details: ${p.customDetails.trim()}` : ''}

Rules:
- Write in the first person, as this person talking about themselves.
- Begin with "Hi my name is [Name]." using a name that suits the parameters.
- Cover their background, how they get on with technology, what they want from an app, and what frustrates them, in a way that would shape how they behave in a usability test.
- Under 100 words. One short paragraph, then up to three bullet points, each starting with "- ".
- Plain text only: no markdown emphasis, no headings.`;
}

const PATIENCE_NOTE: Record<PatienceLevel, (n: number) => string> = {
  low: (n) => `You have little patience with technology. Frustration builds quickly when a screen is confusing, and you would give up after about ${n} screens.`,
  medium: (n) => `You have moderate patience. You will try a reasonable number of things, about ${n} screens' worth, before giving up.`,
  high: (n) => `You are persistent and methodical. You will try many approaches, about ${n} screens' worth, before giving up.`,
};

export interface StepPromptInput {
  persona: string;
  challenge: string;
  patience: PatienceLevel;
  screenName: string;
  stepNumber: number;
  history: Step[];
  /** What went wrong on the last step, if anything, told as the persona
   *  would have experienced it. */
  feedback?: string;
  canGoBack: boolean;
  /** True when the prototype has nothing wired on this screen. */
  deadEnd: boolean;
}

const HISTORY_WINDOW = 5;

/** Earlier steps for the model to remember: the last few in full, anything
 *  older as one line each. */
function historyText(history: Step[]): string {
  if (history.length === 0) return 'None. This is the first screen you have seen.';
  const older = history.slice(0, -HISTORY_WINDOW);
  const recent = history.slice(-HISTORY_WINDOW);
  const line = (s: Step) => {
    const o = s.outcome;
    const did =
      o.kind === 'navigated' ? `tapped "${s.decision.component}" and went to "${o.toName}"`
      : o.kind === 'back' ? `went back to "${o.toName}"`
      : o.kind === 'design-gap' || o.kind === 'no-match' ? `tapped "${o.component}" and nothing happened`
      : o.kind === 'nowhere-back' ? 'tried to go back, but there was nowhere to go back to'
      : 'did not pick anything to tap';
    return `Step ${s.number}, on "${s.screenName}": ${did}.`;
  };
  let out = '';
  if (older.length) out += `Earlier, in brief:\n${older.map(line).join('\n')}\n\nMost recently:\n`;
  out += recent.map((s) => `${line(s)}\nWhat you said: ${s.thought}`).join('\n\n');
  return out;
}

/** The prompt for one screen. Every call is independent, so each one carries
 *  the persona, the task and the journey so far: leaving the persona out of
 *  later steps (as an earlier version of this tool did) lets the model drift
 *  back into a neutral voice. */
export function stepPrompt(input: StepPromptInput): string {
  const rule = PATIENCE[input.patience];
  return `You are taking part in a usability test of an app prototype. Stay in character as this person:

${input.persona}

What you are trying to do: ${input.challenge}

${PATIENCE_NOTE[input.patience](rule.maxSteps)}

YOUR JOURNEY SO FAR
${historyText(input.history)}

NOW
This is screen ${input.stepNumber}. You are looking at the attached screenshot of "${input.screenName}".${input.feedback ? `\n${input.feedback}` : ''}${input.deadEnd ? '\nNothing on this screen seems to respond to taps. If you cannot see proof that you are done, going back is your only move.' : ''}

Think aloud exactly as you would if someone had just handed you this screen. You are not performing and you are not reviewing the design: you are a person trying to get something done. Notice what catches your eye first, what you skip past, where you hesitate. You may assume wrongly, miss things, or second-guess yourself. Do not restate your goal as if reading it from a brief, and do not describe the interface analytically. Keep it to a short paragraph.

Then end your reply with exactly these four lines:
ACTION_COMPONENT: "the exact label or name of the one element you would tap next" (or "none")
ACTION_LOCATION: "where it is on a 3x3 grid of the screen: top-left, top-center, top-right, center-left, center, center-right, bottom-left, bottom-center or bottom-right"
GO_BACK: YES or NO${input.canGoBack ? '' : ' (there is no earlier screen to go back to yet)'}
TASK_COMPLETE: YES or NO

Only answer TASK_COMPLETE: YES if this screenshot already shows proof that the task is done. If you still need to tap something to finish, answer NO and name that element: you will see the result on the next screen.`;
}

export interface AnalysisPromptInput {
  persona: string;
  challenge: string;
  steps: Step[];
}

export function analysisPrompt(input: AnalysisPromptInput): string {
  const journey = input.steps
    .map((s) => {
      const o = s.outcome;
      const result =
        o.kind === 'navigated' ? `Tapped "${s.decision.component}" and moved to "${o.toName}".`
        : o.kind === 'back' ? `Went back to "${o.toName}".`
        : o.kind === 'complete' ? 'Judged the task complete.'
        : o.kind === 'design-gap' ? `Tapped "${o.component}", which has no interaction in the prototype. Nothing happened.`
        : o.kind === 'no-match' ? `Tapped "${o.component}", which could not be matched to one element. Nothing happened.`
        : o.kind === 'nowhere-back' ? 'Tried to go back with nowhere to go.'
        : 'Chose nothing to tap.';
      return `Step ${s.number} on "${s.screenName}":\n${s.thought}\nResult: ${result}`;
    })
    .join('\n\n---\n\n');

  return `You are a UX researcher who has just watched a usability test. A persona worked through an app prototype and completed the task. Analyse the session.

Persona: ${input.persona}
Task: ${input.challenge}

Transcript:
---
${journey}
---

Write these four sections, with these exact headings:

### Emotional Reactions
Three to five emotions the persona showed (for example frustration, confusion, relief). For each, name the step and say why.

### Accessibility Notes
Concerns or strengths the session suggests: readability, contrast, clarity of navigation, target sizes, labelling.

### Suggestions
Three to five specific changes to the design, each tied to something that happened in the session.

### SUS Score
Answer the ten System Usability Scale statements as the persona, in the first person. Rate each from 1 (strongly disagree) to 5 (strongly agree). For each statement write a line "SCORE_n: r" (for example "SCORE_1: 4") followed by one sentence of justification that points to a step. Judge the quality of the journey, not only that it ended well: a prototype that works but causes friction typically lands between 40 and 60.

${SUS_STATEMENTS.map((s, i) => `${i + 1}. ${s}`).join('\n')}

All ten lines, SCORE_1 to SCORE_10, are required, each a whole number from 1 to 5. Do not calculate a total: it is worked out from your answers.

Finish with two or three sentences on overall usability: what worked and what got in the way.`;
}
