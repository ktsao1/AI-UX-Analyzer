import { describe, expect, it } from 'vitest';
import { parseFigmaUrl } from '../src/lib/figmaUrl';
import { gridCell, matchHotspot, parseGridCell } from '../src/lib/matching';
import { parseDecision, thoughtOf } from '../src/lib/parsing';
import { patienceFor } from '../src/lib/personas';
import { buildPrototype, reachableScreens, type FigmaNode } from '../src/lib/prototype';
import { parseSus, susGrade, susScore } from '../src/lib/sus';
import { section } from '../src/lib/summary';
import type { Screen } from '../src/lib/types';

describe('parseFigmaUrl', () => {
  it('reads design, file and proto links', () => {
    expect(parseFigmaUrl('https://www.figma.com/design/AbC123/My-App?node-id=12-34&t=x')).toEqual({ fileKey: 'AbC123', nodeId: '12:34' });
    expect(parseFigmaUrl('https://figma.com/file/AbC123/My-App?node-id=1%3A2')).toEqual({ fileKey: 'AbC123', nodeId: '1:2' });
    expect(parseFigmaUrl('https://www.figma.com/proto/AbC123/My-App?node-id=5-6&starting-point-node-id=1-2')).toEqual({ fileKey: 'AbC123', nodeId: '5:6' });
  });
  it('converts every dash in a nested id and uses a branch key', () => {
    expect(parseFigmaUrl('https://www.figma.com/design/Main/branch/Br4nch/App?node-id=I12-34;56-78')).toEqual({ fileKey: 'Br4nch', nodeId: 'I12:34;56:78' });
  });
  it('rejects anything else', () => {
    expect(parseFigmaUrl('not a url')).toBeNull();
    expect(parseFigmaUrl('https://example.com/design/AbC/x?node-id=1-2')).toBeNull();
    expect(parseFigmaUrl('https://www.figma.com/design/AbC/x')).toBeNull();
  });
});

describe('parseDecision', () => {
  it('reads the four fields', () => {
    const d = parseDecision('Hmm.\n\nACTION_COMPONENT: "Settings"\nACTION_LOCATION: "center-left"\nGO_BACK: NO\nTASK_COMPLETE: NO');
    expect(d).toEqual({ component: 'Settings', location: 'center-left', goBack: false, complete: false });
  });
  it('tolerates bold, curly quotes, case and no quotes', () => {
    const d = parseDecision('**ACTION_COMPONENT:** “Edit Profile”\n- action_location: Middle Right\n**GO_BACK**: yes\nTASK_COMPLETE: Yes.');
    expect(d).toEqual({ component: 'Edit Profile', location: 'center-right', goBack: true, complete: true });
  });
  it('treats "none" and a missing line as no action', () => {
    expect(parseDecision('ACTION_COMPONENT: "none"\nTASK_COMPLETE: YES').component).toBeNull();
    expect(parseDecision('I am lost.')).toEqual({ component: null, location: null, goBack: false, complete: false });
  });
  it('strips the fields from the thought', () => {
    expect(thoughtOf('Plain words at last.\n\nACTION_COMPONENT: "Save"\nACTION_LOCATION: "bottom-center"\nGO_BACK: NO\nTASK_COMPLETE: NO')).toBe('Plain words at last.');
  });
});

describe('SUS', () => {
  it('scores by the standard formula', () => {
    expect(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1])).toBe(100);
    expect(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5])).toBe(0);
    expect(susScore([3, 3, 3, 3, 4, 2, 3, 3, 3, 2])).toBe(57.5);
  });
  it('refuses a bad set of answers', () => {
    expect(() => susScore([3, 3, 3])).toThrow();
    expect(() => susScore([6, 3, 3, 3, 3, 3, 3, 3, 3, 3])).toThrow();
  });
  it('parses plain and bold score lines, and needs all ten', () => {
    const text = Array.from({ length: 10 }, (_, i) => (i % 2 ? `SCORE_${i + 1}: 2` : `**SCORE_${i + 1}: 4**`)).join('\nbecause.\n');
    expect(parseSus(text)).toEqual({ answers: [4, 2, 4, 2, 4, 2, 4, 2, 4, 2], score: 75 });
    expect(parseSus(text.replace('SCORE_10: 2', ''))).toBeNull();
  });
  it('does not read SCORE_1 out of SCORE_10', () => {
    expect(parseSus('SCORE_10: 5')).toBeNull();
  });
  it('grades', () => {
    expect([90, 75, 57.5, 30, 10].map(susGrade)).toEqual(['Excellent', 'Good', 'OK', 'Poor', 'Awful']);
  });
});

describe('matching', () => {
  const screen: Screen = {
    id: 's', name: 'S', box: { x: 100, y: 100, width: 300, height: 600 },
    hotspots: [
      { id: 'a', name: 'Icon / Menu', keywords: ['icon / menu'], labelled: false, box: { x: 110, y: 110, width: 30, height: 30 }, target: { kind: 'screen', screenId: 'menu' } },
      { id: 'b', name: 'Row', keywords: ['row', 'account'], labelled: true, box: { x: 110, y: 350, width: 280, height: 60 }, target: { kind: 'screen', screenId: 'account' } },
      { id: 'c', name: 'Button', keywords: ['button', 'save'], labelled: true, box: { x: 110, y: 620, width: 100, height: 40 }, target: { kind: 'screen', screenId: 'x' } },
      { id: 'd', name: 'Button', keywords: ['button', 'save'], labelled: true, box: { x: 290, y: 620, width: 100, height: 40 }, target: { kind: 'screen', screenId: 'y' } },
    ],
  };
  it('finds the grid cell relative to the screen', () => {
    expect(gridCell(screen.hotspots[0].box!, screen.box!)).toBe('top-left');
    expect(gridCell(screen.hotspots[1].box!, screen.box!)).toBe('center');
    expect(parseGridCell('Center Center')).toBe('center');
    expect(parseGridCell('somewhere')).toBeNull();
  });
  it('matches by words', () => {
    expect(matchHotspot(screen, 'Account', null)).toMatchObject({ kind: 'match', hotspot: { id: 'b' } });
    expect(matchHotspot(screen, 'Account row', 'center')).toMatchObject({ kind: 'match', hotspot: { id: 'b' } });
  });
  it('uses the cell to tell two alike elements apart, and says so when it cannot', () => {
    expect(matchHotspot(screen, 'Save', 'bottom-right')).toMatchObject({ kind: 'match', hotspot: { id: 'd' } });
    expect(matchHotspot(screen, 'Save', null)).toEqual({ kind: 'ambiguous' });
  });
  it('takes a lone icon on position, but never a labelled element', () => {
    expect(matchHotspot(screen, 'three lines', 'top-left')).toMatchObject({ kind: 'match', hotspot: { id: 'a' } });
    expect(matchHotspot(screen, 'Help', 'center')).toEqual({ kind: 'design-gap' });
  });
});

describe('buildPrototype', () => {
  const text = (id: string, characters: string): FigmaNode => ({ id, name: characters, type: 'TEXT', characters });
  const doc: FigmaNode = {
    id: '0:0', name: 'Document', type: 'DOCUMENT',
    children: [{
      id: '0:1', name: 'Page', type: 'CANVAS', flowStartingPoints: [{ nodeId: '1:1', name: 'Main flow' }],
      children: [
        {
          id: '1:1', name: 'Home', type: 'FRAME', absoluteBoundingBox: { x: 0, y: 0, width: 300, height: 600 },
          children: [
            { id: '1:2', name: 'CTA', type: 'INSTANCE', absoluteBoundingBox: { x: 20, y: 500, width: 260, height: 50 }, children: [text('1:3', 'Get started')],
              interactions: [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: '2:5', navigation: 'NAVIGATE' }] }] },
            { id: '1:4', name: 'Hover card', type: 'FRAME', interactions: [{ trigger: { type: 'ON_HOVER' }, actions: [{ type: 'NODE', destinationId: '2:1' }] }] },
          ],
        },
        {
          id: '2:1', name: 'Details', type: 'FRAME', absoluteBoundingBox: { x: 400, y: 0, width: 300, height: 600 },
          children: [
            { id: '2:5', name: 'Body', type: 'FRAME', children: [] },
            { id: '2:2', name: 'Chevron', type: 'VECTOR', reactions: [{ trigger: { type: 'ON_CLICK' }, action: { type: 'BACK' } }] },
            { id: '2:3', name: 'Loop', type: 'FRAME', children: [text('2:4', 'Start over')], transitionNodeID: '1:1' },
          ],
        },
      ],
    }],
  };
  const p = buildPrototype(doc, 'Test');

  it('finds screens, flows and tap hotspots, and ignores hover', () => {
    expect(Object.keys(p.screens)).toEqual(['1:1', '2:1']);
    expect(p.flows).toEqual([{ name: 'Main flow', startId: '1:1' }]);
    expect(p.screens['1:1'].hotspots).toHaveLength(1);
  });
  it('resolves a link to a nested layer to its screen, and collects text', () => {
    const cta = p.screens['1:1'].hotspots[0];
    expect(cta.target).toEqual({ kind: 'screen', screenId: '2:1' });
    expect(cta.keywords.sort()).toEqual(['cta', 'get started']);
    expect(cta.labelled).toBe(true);
  });
  it('reads back actions, old-style links and loops', () => {
    const [chevron, loop] = p.screens['2:1'].hotspots;
    expect(chevron.target).toEqual({ kind: 'back' });
    expect(chevron.labelled).toBe(false);
    expect(loop.target).toEqual({ kind: 'screen', screenId: '1:1' });
    expect(reachableScreens(p, '1:1').map((s) => s.name)).toEqual(['Home', 'Details']);
  });
  it('offers a flow per entry frame when the file names none', () => {
    const bare = structuredClone(doc);
    delete bare.children![0].flowStartingPoints;
    bare.children![0].children![1].children = bare.children![0].children![1].children!.filter((c) => c.id !== '2:3');
    expect(buildPrototype(bare).flows).toEqual([{ name: 'Home', startId: '1:1' }]);
  });
});

describe('small things', () => {
  it('derives patience from tech savviness and age', () => {
    const base = { gender: '', employmentStatus: '', income: '', customDetails: '' };
    expect(patienceFor({ ...base, age: '26-35', techSavviness: 'beginner' })).toBe('low');
    expect(patienceFor({ ...base, age: '26-35', techSavviness: 'expert' })).toBe('high');
    expect(patienceFor({ ...base, age: '65+', techSavviness: 'expert' })).toBe('medium');
    expect(patienceFor({ ...base, age: '65+', techSavviness: 'intermediate' })).toBe('low');
  });
  it('pulls a section out of the analysis', () => {
    const md = '### Emotional Reactions\n- one\n\n### Suggestions\n- two\n- three\n\n### SUS Score\nSCORE_1: 3';
    expect(section(md, 'Suggestions')).toBe('- two\n- three');
    expect(section(md, 'SUS Score')).toBe('SCORE_1: 3');
    expect(section(md, 'Missing')).toBe('');
  });
});
