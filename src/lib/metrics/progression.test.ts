import { describe, expect, it } from "vitest";
import { gymLoadPoints, personalRecord, suggestWeight, type PastPerformance } from "./progression";

// Mirrors the plan in docs/reference/trening.html: "Przysiad ze sztangą 4×5-6".
const squat = { targetSets: 4, repMax: 6, step: 2.5, progression: "weight" as const };

const session = (performed_on: string, sets: [number, number | null][]): PastPerformance => ({
  performed_on,
  created_at: `${performed_on}T18:00:00.000Z`,
  sets: sets.map(([reps, weight_kg]) => ({ reps, weight_kg })),
});

describe("suggestWeight", () => {
  it("offers a step up when every set hit the top of the range", () => {
    const history = [session("2026-09-14", [[6, 60], [6, 60], [6, 60], [6, 60]])];
    expect(suggestWeight(history, squat)).toEqual({ last: 60, next: 62.5, up: true });
  });

  it("repeats the weight when one set fell short", () => {
    const history = [session("2026-09-14", [[6, 60], [6, 60], [5, 60], [6, 60]])];
    expect(suggestWeight(history, squat)).toEqual({ last: 60, next: 60, up: false });
  });

  it("repeats the weight when fewer sets were done than planned", () => {
    const history = [session("2026-09-14", [[6, 60], [6, 60], [6, 60]])];
    expect(suggestWeight(history, squat)).toEqual({ last: 60, next: 60, up: false });
  });

  it("uses the heaviest set of the latest session", () => {
    const history = [
      session("2026-09-07", [[6, 80]]),
      session("2026-09-14", [[6, 55], [6, 60], [6, 57.5], [6, 60]]),
    ];
    expect(suggestWeight(history, squat)?.last).toBe(60);
  });

  it("respects a custom step, e.g. dumbbells added in pairs", () => {
    const history = [session("2026-09-14", [[10, 20], [10, 20], [10, 20]])];
    const suggestion = suggestWeight(history, { targetSets: 3, repMax: 10, step: 4, progression: "weight" });
    expect(suggestion).toEqual({ last: 20, next: 24, up: true });
  });

  it("keeps prehab work light: fixed progression never steps up", () => {
    const history = [session("2026-09-14", [[15, 12], [15, 12], [15, 12]])];
    const suggestion = suggestWeight(history, { targetSets: 3, repMax: 15, step: 2.5, progression: "fixed" });
    expect(suggestion).toEqual({ last: 12, next: 12, up: false });
  });

  it("has nothing to suggest for plank or box jumps", () => {
    const history = [session("2026-09-14", [[40, null]])];
    expect(suggestWeight(history, { ...squat, progression: "time" })).toBeNull();
    expect(suggestWeight(history, { ...squat, progression: "height" })).toBeNull();
  });

  it("has nothing to suggest without weights or without history", () => {
    expect(suggestWeight([], squat)).toBeNull();
    expect(suggestWeight([session("2026-09-14", [[8, null], [8, 0]])], squat)).toBeNull();
  });

  it("avoids floating point noise when adding the step", () => {
    const history = [session("2026-09-14", [[6, 60.1], [6, 60.1], [6, 60.1], [6, 60.1]])];
    expect(suggestWeight(history, squat)?.next).toBe(62.6);
  });
});

describe("personalRecord", () => {
  it("tracks the heaviest set and the best session volume", () => {
    const history = [
      session("2026-09-07", [[5, 70], [5, 70]]), // 700 kg
      session("2026-09-14", [[10, 50], [10, 50], [10, 50]]), // 1500 kg
    ];
    expect(personalRecord(history)).toEqual({ maxWeightKg: 70, bestVolumeKg: 1500, sessionCount: 2 });
  });

  it("returns nothing without history", () => {
    expect(personalRecord([])).toBeNull();
  });
});

describe("gymLoadPoints", () => {
  it("sums reps × kg and divides by 1000", () => {
    expect(gymLoadPoints([{ reps: 5, weight_kg: 100 }, { reps: 5, weight_kg: 100 }])).toBe(1);
  });

  it("counts sets without weight as zero", () => {
    expect(gymLoadPoints([{ reps: 40, weight_kg: null }])).toBe(0);
  });
});
