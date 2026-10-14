import type { Hotspot, Prototype, Rect, ScreenSource } from '../lib/types';

// The sample prototype: six wireframe screens of an app that is nobody's
// product, so the tool can be tried without a Figma file or any keys. It is
// described here the way a Figma file would be after `buildPrototype`:
// screens, and the elements on each that are wired to go somewhere.
//
// One thing is deliberately left unwired: the profile photo on Settings. A
// first-time user reaches for it, nothing happens, and the analyzer reports
// it as a design gap.

const W = 556;
const H = 1266;
const screenBox: Rect = { x: 0, y: 0, width: W, height: H };
const box = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });

const to = (from: string, name: string, keywords: string[], b: Rect, screenId: string, labelled = true): Hotspot => ({
  id: `${from}:${name}`, name, keywords, labelled, box: b, target: { kind: 'screen', screenId },
});
const back = (from: string): Hotspot => ({
  id: `${from}:back`, name: 'Back', labelled: false, keywords: ['back', 'back arrow', 'back button'], box: box(34, 100, 44, 44), target: { kind: 'back' },
});

export const DEMO_PROTOTYPE: Prototype = {
  name: 'Sample prototype',
  screens: {
    home: {
      id: 'home', name: 'Home', box: screenBox,
      hotspots: [to('home', 'Menu icon', ['menu icon', 'menu', 'hamburger menu', 'three lines'], box(36, 106, 40, 33), 'menu', false)],
    },
    menu: {
      id: 'menu', name: 'Menu', box: screenBox,
      hotspots: [
        to('menu', 'Home', ['home'], box(36, 250, 228, 104), 'home'),
        to('menu', 'Settings', ['settings'], box(36, 562, 228, 104), 'settings'),
      ],
    },
    settings: {
      id: 'settings', name: 'Settings', box: screenBox,
      hotspots: [back('settings'), to('settings', 'Account', ['account'], box(36, 450, 484, 96), 'account')],
    },
    account: {
      id: 'account', name: 'Account', box: screenBox,
      hotspots: [back('account'), to('account', 'Edit profile', ['edit profile'], box(36, 692, 484, 96), 'edit')],
    },
    edit: {
      id: 'edit', name: 'Edit profile', box: screenBox,
      hotspots: [back('edit'), to('edit', 'Save', ['save'], box(36, 852, 484, 96), 'saved')],
    },
    saved: {
      id: 'saved', name: 'Account', box: screenBox,
      hotspots: [back('saved'), to('saved', 'Edit profile', ['edit profile'], box(36, 812, 484, 96), 'edit')],
    },
  },
  flows: [{ name: 'Account settings', startId: 'home' }],
};

export const demoImageUrl = (screenId: string) => `${import.meta.env.BASE_URL}demo/${screenId}.webp`;

export const demoScreens: ScreenSource = {
  async getImage(screenId) {
    return { url: demoImageUrl(screenId) };
  },
};
