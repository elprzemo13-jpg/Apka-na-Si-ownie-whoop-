// Weekly indicators, ported from docs/reference/trening.html.
// The formulas are fixed by BRIEF.md section 4 — do not change them.

import { isInWeek, toIsoDate, weekStart, type IsoDate } from "../dates";
import type { Discipline } from "../data/types";

/** Per-kilometre multipliers agreed in docs/PLAN.md (P1). */
export const LOAD_MULTIPLIER: Record<Exclude<Discipline, "gym">, number> = {
  swim: 1.2,
  run: 0.5,
  bike: 0.12,
};

export type LoadSession = {
  discipline: Discipline;
  performed_on: IsoDate;
  /** metres, for endurance disciplines */
  distance_m: number | null;
  /** sum of reps × kg, for gym sessions */
  volume_kg: number;
  warmup_done: boolean;
  stretch_done: boolean;
};

/** Gym: volume / 1000. Endurance: kilometres × multiplier. */
export function loadPoints(session: LoadSession): number {
  if (session.discipline === "gym") return session.volume_kg / 1000;
  return ((session.distance_m ?? 0) / 1000) * LOAD_MULTIPLIER[session.discipline];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function weekLoad(sessions: LoadSession[], weekStartDate: IsoDate): number {
  return round(
    sessions
      .filter((s) => isInWeek(s.performed_on, weekStartDate))
      .reduce((sum, s) => sum + loadPoints(s), 0),
  );
}

export type LoadIndicator = {
  /** this week against the baseline, in percent */
  percent: number;
  /** false when there is no history to compare against yet */
  hasBaseline: boolean;
  thisWeek: number;
  baseline: number;
};

/**
 * Load = this week / average of the three previous weeks × 100.
 * Weeks without any training are left out of the average.
 */
export function loadIndicator(sessions: LoadSession[], today = new Date()): LoadIndicator {
  const thisWeek = weekLoad(sessions, weekStart(today));
  const previous = [1, 2, 3]
    .map((weeksAgo) => weekLoad(sessions, weekStart(today, weeksAgo)))
    .filter((value) => value > 0);
  const baseline = previous.length
    ? previous.reduce((sum, value) => sum + value, 0) / previous.length
    : 0;
  // Without history the app shows 100% and says it is still collecting data.
  if (baseline <= 0) return { percent: 100, hasBaseline: false, thisWeek, baseline: 0 };
  return { percent: Math.round((thisWeek / baseline) * 100), hasBaseline: true, thisWeek, baseline: round(baseline) };
}

export type Goal = { discipline: Discipline; target_sessions: number };

/** Σ min(done, target) / Σ target × 100, capped per discipline. */
export function weekCompletion(
  sessions: { discipline: Discipline; performed_on: IsoDate }[],
  goals: Goal[],
  today = new Date(),
): { percent: number; perDiscipline: { discipline: Discipline; done: number; target: number }[] } {
  const start = weekStart(today);
  const active = goals.filter((goal) => goal.target_sessions > 0);
  const perDiscipline = active.map((goal) => ({
    discipline: goal.discipline,
    done: sessions.filter((s) => s.discipline === goal.discipline && isInWeek(s.performed_on, start)).length,
    target: goal.target_sessions,
  }));
  const target = perDiscipline.reduce((sum, row) => sum + row.target, 0);
  if (target === 0) return { percent: 0, perDiscipline };
  const done = perDiscipline.reduce((sum, row) => sum + Math.min(row.done, row.target), 0);
  return { percent: Math.round((done / target) * 100), perDiscipline };
}

/** How many of the last 14 days (today included) had any training, in percent. */
export function regularity(dates: IsoDate[], today = new Date()): number {
  const trained = new Set(dates);
  let hit = 0;
  for (let i = 0; i < 14; i++) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    if (trained.has(toIsoDate(day))) hit++;
  }
  return Math.round((hit / 14) * 100);
}

/**
 * Share of gym sessions with the warm-up (or stretching) fully ticked.
 * Counted over the whole history, as in the original app.
 */
export function checklistRate(
  gymSessions: { warmup_done: boolean; stretch_done: boolean }[],
  kind: "warmup" | "stretch",
): number {
  if (gymSessions.length === 0) return 0;
  const done = gymSessions.filter((s) => (kind === "warmup" ? s.warmup_done : s.stretch_done)).length;
  return Math.round((done / gymSessions.length) * 100);
}

export type RingTone = "green" | "yellow" | "red";

/** Load has its own thresholds: too little is a warning as well as too much. */
export function loadTone(percent: number): RingTone {
  if (percent > 145) return "red";
  if (percent > 115 || percent < 60) return "yellow";
  return "green";
}

export function ringTone(percent: number): RingTone {
  if (percent >= 70) return "green";
  if (percent >= 40) return "yellow";
  return "red";
}

export type Verdict = "overreaching" | "aboveNorm" | "inNorm" | "belowNorm" | "collecting";

export function verdict(load: LoadIndicator): Verdict {
  if (!load.hasBaseline) return "collecting";
  if (load.percent > 145) return "overreaching";
  if (load.percent > 115) return "aboveNorm";
  if (load.percent >= 60) return "inNorm";
  return "belowNorm";
}
