// Weight suggestion and personal records, ported from the single-user app
// (docs/reference/trening.html). Do not change the rules without asking.

import type { Progression } from "../data/types";

export type PastSet = { reps: number; weight_kg: number | null };

export type PastPerformance = {
  /** local calendar date of the session */
  performed_on: string;
  /** device time, used to order two sessions on the same day */
  created_at: string;
  sets: PastSet[];
};

export type Suggestion = {
  /** heaviest weight used last time */
  last: number;
  /** what to put in the fields now */
  next: number;
  /** true when the step up is earned: every set reached the top of the range */
  up: boolean;
};

const byNewestFirst = (a: PastPerformance, b: PastPerformance) =>
  b.performed_on.localeCompare(a.performed_on) || b.created_at.localeCompare(a.created_at);

/**
 * The suggestion comes from the most recent session with this exercise: its
 * heaviest set. The step up is offered only when the number of sets reached
 * the plan and every set hit the top of the rep range.
 */
export function suggestWeight(
  history: PastPerformance[],
  options: { targetSets: number; repMax: number; step: number; progression: Progression },
): Suggestion | null {
  if (options.progression === "height" || options.progression === "time") return null;

  const last = [...history].sort(byNewestFirst)[0];
  if (!last) return null;

  const weights = last.sets.map((s) => s.weight_kg ?? 0).filter((w) => w > 0);
  if (weights.length === 0) return null;

  const base = Math.max(...weights);
  // A fixed-load exercise (shoulder prehab, band work) stays light on purpose.
  if (options.progression === "fixed") return { last: base, next: base, up: false };

  const allTop =
    last.sets.length >= options.targetSets && last.sets.every((s) => s.reps >= options.repMax);
  return { last: base, next: allTop ? round(base + options.step) : base, up: allTop };
}

/** Avoids 62.50000000000001 from adding 2.5 to 60. */
const round = (value: number) => Math.round(value * 100) / 100;

export type PersonalRecord = {
  /** heaviest single set */
  maxWeightKg: number;
  /** best reps × kg summed over one session */
  bestVolumeKg: number;
  sessionCount: number;
};

export function personalRecord(history: PastPerformance[]): PersonalRecord | null {
  if (history.length === 0) return null;
  let maxWeightKg = 0;
  let bestVolumeKg = 0;
  for (const performance of history) {
    for (const set of performance.sets) {
      if ((set.weight_kg ?? 0) > maxWeightKg) maxWeightKg = set.weight_kg ?? 0;
    }
    const volume = performance.sets.reduce((sum, s) => sum + s.reps * (s.weight_kg ?? 0), 0);
    if (volume > bestVolumeKg) bestVolumeKg = volume;
  }
  return { maxWeightKg, bestVolumeKg: round(bestVolumeKg), sessionCount: history.length };
}

/** Gym load points: total reps × kg over the session, divided by 1000. */
export function gymLoadPoints(sets: PastSet[]): number {
  return round(sets.reduce((sum, s) => sum + s.reps * (s.weight_kg ?? 0), 0) / 1000);
}
