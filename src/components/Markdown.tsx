import { Fragment, type ReactNode } from 'react';

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part.replace(/(^|\s)\*([^*\s][^*]*)\*(?=\s|[.,;:!?]|$)/g, '$1$2')}</Fragment>,
  );
}

/** Just enough markdown for a model's written analysis: paragraphs, bullet
 *  and numbered lists, sub-headings and bold. Text is rendered as text, so
 *  nothing in a reply can inject markup. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
    para = [];
    if (list) {
      const items = list.items.map((item, i) => <li key={i}>{inline(item)}</li>);
      blocks.push(list.ordered ? <ol key={blocks.length}>{items}</ol> : <ul key={blocks.length}>{items}</ul>);
    }
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+[.)]\s+(.*)/);
    const heading = line.match(/^#{2,6}\s+(.*)/);
    if (!line) flush();
    else if (heading) {
      flush();
      blocks.push(<h4 key={blocks.length}>{inline(heading[1])}</h4>);
    } else if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (para.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else if (list) list.items[list.items.length - 1] += ` ${line}`;
    else para.push(line);
  }
  flush();
  return <div className="prose">{blocks}</div>;
}
