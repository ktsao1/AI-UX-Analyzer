import { SUS_STATEMENTS, susGrade } from '../lib/sus';
import { formatDuration, section, summarise } from '../lib/summary';
import type { Persona, RunResult } from '../lib/types';
import { Button } from './Kit';
import { Markdown } from './Markdown';
import { PhoneScreen } from './PhoneScreen';
import { Journey, outcomeText, Sheet } from './RunView';

interface Props {
  results: RunResult[];
  persona: Persona;
  challenge: string;
  selected: number;
  onSelect: (index: number) => void;
  onAgain: () => void;
  onReset: () => void;
  sample: boolean;
}

const one = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const STATUS: Record<RunResult['status'], string> = { completed: 'Completed', 'gave-up': 'Not Completed', cancelled: 'Cancelled', error: 'Stopped by an error' };

export function Results(p: Props) {
  const summary = summarise(p.results);
  const many = p.results.length > 1;
  const run = p.results[Math.min(p.selected, p.results.length - 1)];
  const score = many ? summary.averageSus : (run.sus?.score ?? null);

  return (
    <div className="results">
      <div className="run" style={{ gridTemplateColumns: 'minmax(0, 300px) minmax(0, 1fr)' }}>
        <Sheet persona={p.persona} challenge={p.challenge}>
          <hr className="rule" />
          <span className="label">{many ? `Journey · run ${run.index + 1}` : 'Journey'}</span>
          <Journey steps={run.steps} />
        </Sheet>

        <div className="plate pad" style={{ minWidth: 0 }}>
          <h3 className="pixel" style={{ fontSize: 15, letterSpacing: '0.14em' }}>Analysis Summary</h3>
          <div className="band">
            <div className="plate score">
              <span className="label">
                {many ? 'Average SUS Score' : 'SUS Score'}
                {score !== null && <span className="grade">{susGrade(score)}</span>}
              </span>
              {score !== null ? (
                <strong>{one(many ? Math.round(score) : score)}<small>/100</small></strong>
              ) : (
                <strong style={{ fontSize: 28, letterSpacing: 0 }}>Skipped<small style={{ display: 'block', fontSize: 14, margin: '6px 0 0' }}>Task not completed</small></strong>
              )}
            </div>
            <div className="tile">
              <span className="label">Task Completion</span>
              {many ? (
                <strong>{summary.completed} {summary.completed === 1 ? 'Success' : 'Successes'}<small>{summary.failed} {summary.failed === 1 ? 'Fail' : 'Fails'}</small></strong>
              ) : (
                <strong>{STATUS[run.status]}</strong>
              )}
            </div>
            <div className="tile">
              <span className="label">{many ? 'Average Time' : 'Time Taken'}</span>
              <strong>{formatDuration(many ? summary.averageMs : run.durationMs)}</strong>
            </div>
            <div className="tile">
              <span className="label">{many ? 'Average Steps' : 'Total Steps'}</span>
              <strong>{one(many ? summary.averageSteps : run.steps.length)}</strong>
            </div>
          </div>

          {summary.designGaps.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <span className="label">Expected but Missing UI Elements</span>
              <ul className="gaps">
                {summary.designGaps.map((g) => (
                  <li key={`${g.screenName}-${g.component}`}>
                    <span className="tag gap">Gap</span>
                    <span><b>“{g.component}”</b> on {g.screenName} was expected but has no interaction wired up in the prototype{many ? ` (${g.runs} of ${summary.runs} runs)` : ''}.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {many && (
            <div style={{ marginTop: 24 }}>
              <span className="label">All Analysis Runs · select one to read it</span>
              <div className="runs-table">
                {p.results.map((r, i) => (
                  <button key={r.index} type="button" className="plate runrow" aria-pressed={i === p.selected} onClick={() => p.onSelect(i)}>
                    <span className="pixel" style={{ fontSize: 11 }}>Run {r.index + 1}</span>
                    <b>{r.status === 'completed' ? '✓ ' : '✕ '}{STATUS[r.status]}</b>
                    <span className="muted hide-s">{r.steps.length} steps</span>
                    <span className="muted hide-s">{formatDuration(r.durationMs)}</span>
                    <span className={`pill${r.sus ? '' : ' none'}`}>{r.sus ? `SUS ${one(r.sus.score)}` : 'Skipped'}</span>
                    {r.status !== 'completed' && r.note && <span className="quote">“{r.note}”</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {run.sus ? (
            <div style={{ marginTop: 24 }}>
              <span className="label">Individual SUS Statement Scores{many ? ` · run ${run.index + 1}` : ''}</span>
              <ol className="sus-rows">
                {SUS_STATEMENTS.map((statement, i) => (
                  <li key={statement}>
                    <span className="n">{i + 1}</span>
                    <span>{statement}</span>
                    <span className="meter" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= run.sus!.answers[i] ? 'on' : ''} />)}</span>
                    <b>{run.sus!.answers[i]}<span className="sr-only"> out of 5</span></b>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="notice" style={{ marginTop: 24 }}>
              {run.status === 'completed'
                ? (run.note ?? 'The analysis did not include all ten SUS answers, so this run has no score.')
                : run.status === 'gave-up'
                  ? `SUS skipped: the task was not completed. “${run.note}”`
                  : (run.note ?? STATUS[run.status])}
            </p>
          )}
        </div>
      </div>

      {run.analysis && (
        <div className="columns">
          {[['Emotional Reactions', 'Emotional Reactions'], ['Accessibility Notes', 'Accessibility Notes'], ['AI Suggestions', 'Suggestions']].map(([title, heading]) => {
            const body = section(run.analysis!, heading);
            return body ? (
              <div className="plate pad" key={title}>
                <h3 className="pixel" style={{ fontSize: 13, marginBottom: 12 }}>{title}</h3>
                <Markdown text={body} />
              </div>
            ) : null;
          })}
        </div>
      )}

      <div className="plate pad">
        <h3 className="pixel" style={{ fontSize: 15, letterSpacing: '0.14em' }}>Step by step{many ? ` · run ${run.index + 1}` : ''}</h3>
        <div className="steps">
          {run.steps.map((s) => (
            <article className="stepcard" key={s.number}>
              <PhoneScreen src={s.imageUrl} alt={`Step ${s.number}: ${s.screenName}`} cell={s.decision.location} tap={s.tap} />
              <div>
                <h4><span className="badge" style={{ translate: 'none' }}>{s.number}</span>{s.screenName}</h4>
                <p style={{ whiteSpace: 'pre-wrap' }}>{s.thought || <span className="muted">No thought was returned.</span>}</p>
                <div className="facts">
                  <span>Component: <b>{s.decision.component ? `“${s.decision.component}”` : 'None'}</b></span>
                  <span>Location: <b>{s.decision.location ?? 'None'}</b></span>
                  <span>Task complete: <b>{s.decision.complete ? 'YES' : 'NO'}</b></span>
                </div>
                <p className="outcome">{s.outcome.kind === 'design-gap' && <span className="tag gap" style={{ marginRight: 8 }}>Gap</span>}{outcomeText(s)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      {p.sample && <p className="notice">Sample mode: the persona's words and the written analysis above are pre-written. The journey, the design gap and the scores were worked out from them by the same code a live run uses.</p>}

      <div className="actions">
        <Button onClick={p.onAgain}>Run again</Button>
        <Button variant="ghost" onClick={p.onReset}>Test another prototype</Button>
      </div>
    </div>
  );
}
