import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

export function Button({ variant, size, wide, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'ghost'; size?: 'small'; wide?: boolean }) {
  return <button type="button" {...rest} className={cx('plate btn', variant, size, wide && 'wide', className)} />;
}

export function Chapter({ number, title, sub, children, id }: { number: string; title: string; sub: string; children: ReactNode; id?: string }) {
  return (
    <section className="chapter fade-in" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="chapter-head">
        <span className="plate chapter-no" aria-hidden="true">{number}</span>
        <h2 id={id ? `${id}-title` : undefined} tabIndex={-1}>{title}</h2>
        <p>{sub}</p>
      </div>
      {children}
    </section>
  );
}

/** Where the visitor is in setup. A step they have already reached can be
 *  returned to; one ahead of them cannot, so the order stays the order. */
export function Progress({ steps, current, reachable, onStep }: { steps: string[]; current: number; reachable: number; onStep: (index: number) => void }) {
  return (
    <nav className="progress" aria-label="Setup steps">
      <ol>
        {steps.map((name, i) => (
          <li key={name}>
            <button type="button" className="progress-step" data-state={i === current ? 'current' : i < current ? 'done' : 'todo'} aria-current={i === current ? 'step' : undefined} disabled={i > reachable} onClick={() => onStep(i)}>
              <span className="plate chapter-no">{String(i + 1).padStart(2, '0')}</span>
              {name}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Back and Next under a setup step. `hint` says why Next is not ready yet. */
export function StepNav({ onBack, onNext, nextLabel = 'Next', canNext, hint, children }: { onBack?: () => void; onNext?: () => void; nextLabel?: string; canNext?: boolean; hint?: string | false; children?: ReactNode }) {
  return (
    <div className="step-nav">
      <div className="step-nav-row">
        {onBack ? <Button variant="ghost" onClick={onBack}>← Back</Button> : <span />}
        {onNext && <Button disabled={!canNext} onClick={onNext}>{nextLabel} →</Button>}
        {children}
      </div>
      {hint && <p className="muted step-nav-hint">{hint}</p>}
    </div>
  );
}

export const Dots = () => (
  <span className="dots" aria-hidden="true"><i /><i /><i /></span>
);

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;
export const FigmaMark = () => <img src={asset('marks/figma.png')} alt="" width={16} height={16} />;
export const GeminiMark = ({ size = 16 }: { size?: number }) => <img src={asset('marks/gemini.png')} alt="" width={size} height={size} />;

/** Reveal a text a few characters at a time, as if it were being said. The
 *  whole text is always what assistive tech reads; this only paces what is
 *  drawn. Honours reduced motion by showing it at once. */
export function useTyped(text: string, charsPerSecond = 70): { shown: string; done: boolean } {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setCount(text.length);
      return;
    }
    setCount(0);
    if (!text) return;
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.floor(((now - started) / 1000) * charsPerSecond));
      setCount(n);
      if (n < text.length) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, charsPerSecond]);
  return { shown: text.slice(0, count), done: count >= text.length };
}
