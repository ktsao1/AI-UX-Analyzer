import type { SusResult } from './types';

/** The ten System Usability Scale statements (Brooke, 1986). */
export const SUS_STATEMENTS = [
  'I think that I would like to use this system frequently.',
  'I found the system unnecessarily complex.',
  'I thought the system was easy to use.',
  'I think that I would need the support of a technical person to be able to use this system.',
  'I found the various functions in this system were well integrated.',
  'I thought there was too much inconsistency in this system.',
  'I would imagine that most people would learn to use this system very quickly.',
  'I found the system very cumbersome to use.',
  'I felt very confident using the system.',
  'I needed to learn a lot of things before I could get going with this system.',
] as const;

/** The standard scoring: odd statements are positive (answer − 1), even ones
 *  negative (5 − answer); the sum, out of 40, is scaled to 100. */
export function susScore(answers: number[]): number {
  if (answers.length !== 10 || answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) {
    throw new Error('A SUS score needs ten answers from 1 to 5.');
  }
  const sum = answers.reduce((total, a, i) => total + (i % 2 === 0 ? a - 1 : 5 - a), 0);
  return sum * 2.5;
}

/** Read `SCORE_1: 4` … `SCORE_10: 2` out of the model's analysis. All ten
 *  must be there; a partial set is not a score. */
export function parseSus(text: string): SusResult | null {
  const answers: number[] = [];
  for (let i = 1; i <= 10; i++) {
    const m = text.match(new RegExp(`SCORE[_ ]${i}\\b[*_\\s]*[:：][*_\\s]*([1-5])(?![\\d.])`, 'i'));
    if (!m) return null;
    answers.push(Number(m[1]));
  }
  return { answers, score: susScore(answers) };
}

export type SusGrade = 'Excellent' | 'Good' | 'OK' | 'Poor' | 'Awful';

export function susGrade(score: number): SusGrade {
  if (score >= 85) return 'Excellent';
  if (score >= 71) return 'Good';
  if (score >= 50) return 'OK';
  if (score >= 25) return 'Poor';
  return 'Awful';
}
