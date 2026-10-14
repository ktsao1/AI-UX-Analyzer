import { describe, expect, it } from 'vitest';
import { DEMO_PROTOTYPE, demoScreens } from '../src/demo/prototype';
import { createDemoModel, DEMO_CHALLENGE, DEMO_PERSONAS } from '../src/demo/script';
import { runAnalysis } from '../src/lib/runner';
import { summarise } from '../src/lib/summary';
import type { ModelClient, Persona, RunResult } from '../src/lib/types';

const margaret: Persona = { label: 'Margaret', text: DEMO_PERSONAS[1], patience: 'low', tags: [] };
const run = (runIndex: number, model: ModelClient = createDemoModel(0), signal?: AbortSignal) =>
  runAnalysis({ prototype: DEMO_PROTOTYPE, startId: 'home', persona: margaret, challenge: DEMO_CHALLENGE, model, screens: demoScreens, runIndex, signal });

describe('the sample runs, through the real run loop', () => {
  let results: RunResult[];
  it('run 1: a wrong turn, a design gap, then done in seven steps', async () => {
    const r = await run(0);
    expect(r.status).toBe('completed');
    expect(r.steps.map((s) => s.screenName)).toEqual(['Home', 'Menu', 'Settings', 'Settings', 'Account', 'Edit profile', 'Account']);
    expect(r.steps[2].outcome).toEqual({ kind: 'design-gap', component: 'Profile photo' });
    expect(r.steps[2].tap).toBeUndefined();
    expect(r.steps[1].tap!.x).toBeCloseTo(27, 0);
    expect(r.steps[6].outcome).toEqual({ kind: 'complete' });
    expect(r.sus?.score).toBe(57.5);
    results = [r];
  });
  it('run 2: clean, six steps', async () => {
    const r = await run(1);
    expect(r.status).toBe('completed');
    expect(r.steps).toHaveLength(6);
    expect(r.sus?.score).toBe(65);
    results.push(r);
  });
  it('run 3: goes back once, runs out of patience, and is not scored', async () => {
    const r = await run(2);
    expect(r.status).toBe('gave-up');
    expect(r.steps).toHaveLength(8);
    expect(r.steps[6].outcome).toMatchObject({ kind: 'back', toScreenId: 'settings' });
    expect(r.sus).toBeNull();
    expect(r.note).toMatch(/giving up/);
    results.push(r);
  });
  it('summarises the three', () => {
    const s = summarise(results);
    expect(s).toMatchObject({ runs: 3, completed: 2, failed: 1, averageSteps: 7, averageSus: 61.25 });
    expect(s.designGaps[0]).toEqual({ component: 'Profile photo', screenName: 'Settings', runs: 2 });
  });
});

describe('the run loop', () => {
  const always = (text: string): ModelClient => ({ generate: async (req) => (req.kind === 'step' ? text : '') });

  it('stops after the persona\'s limit of dead ends in a row', async () => {
    const r = await run(0, always('Hm.\nACTION_COMPONENT: "Search"\nACTION_LOCATION: "bottom-center"\nGO_BACK: NO\nTASK_COMPLETE: NO'));
    expect(r.status).toBe('gave-up');
    expect(r.steps).toHaveLength(2);
  });
  it('never runs past the step limit, even when every tap works', async () => {
    let n = 0;
    const loop: ModelClient = { generate: async () => (n++ % 2 === 0 ? 'ACTION_COMPONENT: "Menu icon"\nACTION_LOCATION: "top-left"' : 'ACTION_COMPONENT: "Home"\nACTION_LOCATION: "top-left"') };
    const r = await run(0, loop);
    expect(r.status).toBe('gave-up');
    expect(r.steps).toHaveLength(8);
  });
  it('gives every step the persona and the task', async () => {
    const prompts: string[] = [];
    const base = createDemoModel(0);
    await run(1, { generate: (req) => { if (req.kind === 'step') prompts.push(req.prompt); return base.generate(req); } });
    expect(prompts).toHaveLength(6);
    for (const p of prompts) {
      expect(p).toContain('Hi my name is Margaret');
      expect(p).toContain(DEMO_CHALLENGE);
    }
    expect(prompts[3]).toContain('tapped "Settings" and went to "Settings"');
  });
  it('reports a cancelled run as cancelled', async () => {
    const controller = new AbortController();
    const r = await run(0, { generate: async () => { controller.abort(); return 'x'; } }, controller.signal);
    expect(r.status).toBe('cancelled');
  });
  it('reports a model failure as an error, keeping the steps so far', async () => {
    let n = 0;
    const base = createDemoModel(0);
    const r = await run(0, { generate: (req) => { if (n++ === 2) throw new Error('quota'); return base.generate(req); } });
    expect(r.status).toBe('error');
    expect(r.note).toBe('quota');
    expect(r.steps).toHaveLength(2);
  });
});
