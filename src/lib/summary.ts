import type { RunResult, Step } from './types';

export interface Summary {
  runs: number;
  completed: number;
  failed: number;
  averageMs: number;
  averageSteps: number;
  /** Mean of the scored runs, or null when none was scored. */
  averageSus: number | null;
  /** Elements a persona reached for that the prototype has not wired, with
   *  the screen each was on and how many runs hit it. */
  designGaps: { component: string; screenName: string; runs: number }[];
}

const finished = (r: RunResult) => r.status === 'completed' || r.status === 'gave-up';

/** Roll several passes into one set of numbers. Cancelled and errored passes
 *  are left out: they say nothing about the design. */
export function summarise(all: RunResult[]): Summary {
  const runs = all.filter(finished);
  const mean = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
  const scores = runs.map((r) => r.sus?.score).filter((s): s is number => typeof s === 'number');

  const gaps = new Map<string, { component: string; screenName: string; runs: Set<number> }>();
  for (const run of runs) {
    for (const step of run.steps) {
      if (step.outcome.kind !== 'design-gap') continue;
      const key = `${step.screenId}|${step.outcome.component.toLowerCase()}`;
      const entry = gaps.get(key) ?? { component: step.outcome.component, screenName: step.screenName, runs: new Set<number>() };
      entry.runs.add(run.index);
      gaps.set(key, entry);
    }
  }

  return {
    runs: runs.length,
    completed: runs.filter((r) => r.status === 'completed').length,
    failed: runs.filter((r) => r.status === 'gave-up').length,
    averageMs: mean(runs.map((r) => r.durationMs)),
    averageSteps: mean(runs.map((r) => r.steps.length)),
    averageSus: scores.length ? mean(scores) : null,
    designGaps: [...gaps.values()].map((g) => ({ component: g.component, screenName: g.screenName, runs: g.runs.size })).sort((a, b) => b.runs - a.runs),
  };
}

export const formatDuration = (ms: number) => {
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** A step in a few words, for the journey list. */
export function stepAction(step: Step): string {
  const o = step.outcome;
  switch (o.kind) {
    case 'navigated':
    case 'design-gap':
    case 'no-match':
      return step.decision.component ?? '';
    case 'back':
      return 'Back';
    case 'complete':
      return 'Task complete';
    case 'nowhere-back':
      return 'Back (nowhere to go)';
    case 'no-action':
      return 'No action';
  }
}

/** Pull one `### Heading` section out of the written analysis. */
export function section(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = markdown.match(new RegExp(`^#{2,4}\\s*(?:\\d+\\.\\s*)?${escaped}[^\\n]*\\n([\\s\\S]*?)(?=^#{2,4}\\s|(?![\\s\\S]))`, 'im'));
  return m ? m[1].trim() : '';
}
