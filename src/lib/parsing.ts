import { parseGridCell } from './matching';
import type { Decision } from './types';

// The model ends each reply with four labelled lines. Models are loose with
// formatting, so these accept bold markers, any case, straight or curly
// quotes, or no quotes at all.
const FIELD = (name: string) => new RegExp(`^[\\s>*_-]*${name}[*_]*\\s*[:：]\\s*[*_]*(.*?)[*_\\s]*$`, 'im');
const unquote = (s: string) => s.trim().replace(/^["“”'‘’`]+|["“”'‘’`.]+$/g, '').trim();
const NOTHING = /^(none|n\/a|na|null|nothing|-|—)?$/i;

export function parseDecision(text: string): Decision {
  const field = (name: string) => {
    const m = text.match(FIELD(name));
    return m ? unquote(m[1]) : null;
  };
  const yes = (name: string) => /^yes\b/i.test(field(name) ?? '');
  const component = field('ACTION_COMPONENT');
  return {
    component: component && !NOTHING.test(component) ? component : null,
    location: parseGridCell(field('ACTION_LOCATION')),
    goBack: yes('GO_BACK'),
    complete: yes('TASK_COMPLETE'),
  };
}

/** The reply without its machine-readable lines: what the persona said. */
export function thoughtOf(text: string): string {
  return text
    .split('\n')
    .filter((line) => !/^[\s>*_\d.)-]*(ACTION_COMPONENT|ACTION_LOCATION|GO_BACK|TASK_COMPLETE)\b/i.test(line))
    .join('\n')
    .replace(/\n-{3,}\s*$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
