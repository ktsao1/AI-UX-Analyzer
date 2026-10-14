import type { PatienceLevel, Persona, PersonaParameters } from './types';

export interface Option {
  id: string;
  label: string;
  note?: string;
}

export const PREDEFINED_PERSONAS: (Persona & { id: string; note: string })[] = [
  {
    id: 'boomer',
    label: 'Boomer',
    note: 'Born 1946-1964',
    text: 'A baby boomer (born 1946-1964) who is not very tech-savvy and prefers simple, straightforward interfaces. They may struggle with complex navigation and prefer larger text and buttons.',
    patience: 'low',
    tags: ['Born 1946-1964', 'Not tech-savvy'],
  },
  {
    id: 'millennial',
    label: 'Millennial',
    note: 'Born 1981-1996',
    text: 'A millennial (born 1981-1996) who is comfortable with technology and grew up with the internet. They expect intuitive design and are familiar with common UI patterns.',
    patience: 'medium',
    tags: ['Born 1981-1996', 'Comfortable with tech'],
  },
  {
    id: 'genz',
    label: 'Gen Z',
    note: 'Born 1997-2012',
    text: 'A Gen Z user (born 1997-2012) who is a digital native and expects fast, modern interfaces. They are comfortable with complex interactions and prefer sleek, minimalist designs.',
    patience: 'high',
    tags: ['Born 1997-2012', 'Digital native'],
  },
];

export const PARAMETERS: { key: keyof Omit<PersonaParameters, 'customDetails'>; title: string; options: Option[] }[] = [
  {
    key: 'age',
    title: 'Age Range',
    options: ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'].map((id) => ({ id, label: id })),
  },
  {
    key: 'gender',
    title: 'Gender',
    options: [
      { id: 'male', label: 'Male' },
      { id: 'female', label: 'Female' },
      { id: 'non-binary', label: 'Non-binary' },
      { id: 'prefer-not-to-say', label: 'Prefer not to say' },
    ],
  },
  {
    key: 'employmentStatus',
    title: 'Employment Status',
    options: [
      { id: 'student', label: 'Student' },
      { id: 'unemployed', label: 'Unemployed' },
      { id: 'employed-full', label: 'Full-time' },
      { id: 'employed-part', label: 'Part-time' },
      { id: 'self-employed', label: 'Self-employed' },
      { id: 'retired', label: 'Retired' },
    ],
  },
  {
    key: 'techSavviness',
    title: 'Tech Savviness',
    options: [
      { id: 'beginner', label: 'Beginner' },
      { id: 'basic', label: 'Basic' },
      { id: 'intermediate', label: 'Intermediate' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'expert', label: 'Expert' },
    ],
  },
  {
    key: 'income',
    title: 'Income Level',
    options: [
      { id: 'low', label: 'Low Income', note: 'Below $30k a year' },
      { id: 'lower-middle', label: 'Lower Middle', note: '$30k to $50k a year' },
      { id: 'middle', label: 'Middle Income', note: '$50k to $100k a year' },
      { id: 'upper-middle', label: 'Upper Middle', note: '$100k to $200k a year' },
      { id: 'high', label: 'High Income', note: 'Above $200k a year' },
      { id: 'prefer-not-to-say', label: 'Prefer not to say' },
    ],
  },
];

export const EMPTY_PARAMETERS: PersonaParameters = { age: '', gender: '', employmentStatus: '', techSavviness: '', income: '', customDetails: '' };

export const parametersReady = (p: PersonaParameters) => PARAMETERS.every((param) => Boolean(p[param.key]));

export const labelOf = (key: (typeof PARAMETERS)[number]['key'], id: string) =>
  PARAMETERS.find((p) => p.key === key)?.options.find((o) => o.id === id)?.label ?? id;

/** How long a custom persona keeps trying. Tech savviness sets it; being 65
 *  or over lowers it one level. */
export function patienceFor(p: PersonaParameters): PatienceLevel {
  const base: PatienceLevel = p.techSavviness === 'beginner' || p.techSavviness === 'basic' ? 'low' : p.techSavviness === 'intermediate' ? 'medium' : 'high';
  if (p.age === '65+' && base !== 'low') return base === 'high' ? 'medium' : 'low';
  return base;
}

export interface PatienceRule {
  /** Screens the persona will look at before stopping. */
  maxSteps: number;
  /** Dead ends in a row before stopping. */
  maxFailures: number;
  giveUp: string;
}

export const PATIENCE: Record<PatienceLevel, PatienceRule> = {
  low: { maxSteps: 8, maxFailures: 2, giveUp: "I'm really frustrated. This interface is too confusing and I don't have the patience to keep trying. I'm giving up." },
  medium: { maxSteps: 14, maxFailures: 3, giveUp: "I've tried a number of times but can't figure out how to complete this. I'm going to stop here." },
  high: { maxSteps: 20, maxFailures: 5, giveUp: "Despite trying many different approaches, I haven't been able to complete the task. I'll stop here." },
};

/** The persona's name, when its text opens "Hi my name is …". */
export function nameIn(text: string): string | null {
  const m = text.match(/\bmy name is\s+([A-Z][\p{L}'-]+)/u);
  return m ? m[1] : null;
}
