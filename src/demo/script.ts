import type { ModelClient, ModelRequest } from '../lib/types';

// The sample mode's stand-in for the language model. Nothing here is a
// recording of a real session: every reply was written by hand to show what
// the tool does with a model's replies. They are in the format the real
// model is asked for, and they go through the same parsing, matching and
// scoring as a live run, so the journey, the design gap and the scores on
// screen are all worked out by the tool, not typed in.

export const DEMO_CHALLENGE = 'Find and edit your user profile.';

export const DEMO_PERSONAS = [
  `Hi my name is Linda. I am 71 and retired after thirty years as a nurse. My daughter set up this phone for me, and I mostly use it for photos and messages.
- I take my time and read things twice
- I worry about pressing the wrong thing
- I ask for help before I guess`,
  `Hi my name is Margaret. I am a 68 year old retired teacher and I am still getting used to my smartphone. I like things spelled out in plain words.
- I read every label before I tap
- Small icons and hidden menus confuse me
- I give up quickly when nothing happens`,
];

const reply = (thought: string, component: string, location: string, extra: { back?: boolean; complete?: boolean } = {}) =>
  `${thought}

ACTION_COMPONENT: "${component}"
ACTION_LOCATION: "${location}"
GO_BACK: ${extra.back ? 'YES' : 'NO'}
TASK_COMPLETE: ${extra.complete ? 'YES' : 'NO'}`;

/** Three passes over the sample prototype, so "run it several times" has
 *  something to compare: one with a wrong turn, one clean, one that runs
 *  out of patience. */
const RUNS: string[][] = [
  [
    reply('Oh, lots of little pictures. Where would my own details be? Those three lines up in the corner... my grandson says that is a menu.', 'Menu icon', 'top-left'),
    reply('There we go, a proper list. Orders, Saved... Settings sounds like where my name and things would live.', 'Settings', 'center-left'),
    reply('That little picture at the top must be me. Surely I press my own picture to change my details.', 'Profile photo', 'top-center'),
    reply('Nothing happened. Did I press it wrong? Fine. Account, then. That has to be about me.', 'Account', 'center'),
    reply('Edit profile. Finally, plain words.', 'Edit profile', 'center'),
    reply('I fix my name, and there is Save at the bottom.', 'Save', 'bottom-center'),
    reply('Profile updated. Oh good, it took. Not so bad once I found it.', 'none', 'top-center', { complete: true }),
  ],
  [
    reply('Good morning to you too. Now, I want my own details, and I do not see my name anywhere. I will try the three lines in the corner.', 'Menu icon', 'top-left'),
    reply('A list, good. Settings is usually where they keep the personal things.', 'Settings', 'center-left'),
    reply('Account, Notifications, Appearance... Account is the one about me, I should think.', 'Account', 'center'),
    reply('There is my name and my email. And a button that says Edit profile, which is exactly what I want.', 'Edit profile', 'center'),
    reply('I change the name here and press Save. That seems simple enough.', 'Save', 'bottom-center'),
    reply('It says Profile updated at the top. That is that, then.', 'none', 'top-center', { complete: true }),
  ],
  [
    reply('So many boxes. I only want to change my details. I suppose the lines in the corner open something.', 'Menu icon', 'top-left'),
    reply('Help. Yes, I think I need help, I do not know which of these is mine.', 'Help', 'center-left'),
    reply('That did nothing at all. Well. Settings, then, I have seen my daughter go in there.', 'Settings', 'center-left'),
    reply('There is a little picture of a person. That must be my profile, so I will press that.', 'Profile photo', 'top-center'),
    reply('Nothing again. Is it broken? Account is the top one in the list, I will try it.', 'Account', 'center'),
    reply('My name is right there in the box. I will just press on it and type the new one.', 'Name field', 'center'),
    reply('It will not let me type. I do not understand this at all. I am going back.', 'Back', 'top-left', { back: true }),
    reply('I am right back where I was. Maybe Appearance is about how my profile looks?', 'Appearance', 'center'),
  ],
];

const ANALYSES = [
  { answers: [3, 3, 3, 3, 4, 2, 3, 3, 3, 2], gist: 'I got there, but pressing my own picture did nothing and I lost my nerve for a moment.' },
  { answers: [3, 2, 4, 3, 4, 2, 3, 2, 3, 2], gist: 'Once I found Settings, each screen told me plainly what to press next.' },
];

const JUSTIFICATIONS = [
  'I would use it if I had to, but I would not look forward to it.',
  'The menu is hidden behind an icon, which made the first step harder than it needed to be.',
  'Most screens were clear once I was on them.',
  'I managed alone, though I nearly asked for help on Settings.',
  'Each screen led sensibly to the next.',
  'Buttons and lists looked the same throughout.',
  'Someone used to phones would be quicker than I was.',
  'It took more screens than I expected to reach my own details.',
  'I was unsure until I saw the words Edit profile.',
  'I had to learn that the three lines mean a menu.',
];

function analysis(run: number): string {
  const a = ANALYSES[run] ?? ANALYSES[0];
  const detour = run === 0;
  return `### Emotional Reactions
- **Uncertainty** at step 1: the Home screen shows nothing that says "profile", so the menu icon is a guess.
- **Relief** at step 2: a plain list of words is easier to read than the icons on Home.
${detour ? '- **Confusion** at step 3: the profile photo looks tappable and does nothing, with no feedback.\n- **Impatience** at step 4: the second attempt is made grudgingly.' : '- **Confidence** at step 4: "Edit profile" names the task in the persona\'s own words.'}
- **Satisfaction** at the last step: "Profile updated" confirms the change.

### Accessibility Notes
- The menu is reached only through an unlabelled icon. A visible label would help anyone who does not know the convention.
- The profile photo has the look of a control but is not one${detour ? ', which cost a step here' : ''}.
- Text labels on Settings and Account are clear and the tap targets are a good size.
- The confirmation banner is easy to notice but relies on being read: there is no other change on the screen.

### Suggestions
- Make the profile photo on Settings open the profile, or stop it looking tappable.
- Label the menu icon, or put Account one tap from Home.
- Put the person's name next to their photo on Settings so the screen says whose it is.
- Keep the wording "Edit profile" everywhere the task can be started.

### SUS Score
${a.answers.map((r, i) => `SCORE_${i + 1}: ${r}\n${JUSTIFICATIONS[i]}`).join('\n\n')}

${a.gist} The flow works and its wording is clear, but the first two taps depend on knowing conventions that this persona does not.`;
}

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/** A model client that answers from the script above. `delay` paces it so
 *  the page can be followed; tests pass 0. */
export function createDemoModel(delay = 1): ModelClient {
  let personaCalls = 0;
  return {
    async generate(request: ModelRequest) {
      if (request.kind === 'persona') {
        await wait(1400 * delay, request.signal);
        return DEMO_PERSONAS[personaCalls++ % DEMO_PERSONAS.length];
      }
      if (request.kind === 'analysis') {
        await wait(1800 * delay, request.signal);
        return analysis(request.runIndex % ANALYSES.length);
      }
      const run = RUNS[request.runIndex % RUNS.length];
      const text = run[request.stepNumber - 1] ?? reply('I do not know what else to try.', 'none', 'center');
      await wait((900 + text.length * 9) * delay, request.signal);
      return text;
    },
  };
}
