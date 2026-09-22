import { describe, expect, it } from "vitest";
import {
  checklistRate,
  loadIndicator,
  loadPoints,
  loadTone,
  regularity,
  ringTone,
  verdict,
  weekCompletion,
  weekLoad,
  type LoadSession,
} from "./weekly";

// Tuesday 2026-09-22; the week runs Monday 21st to Sunday 27th.
const TODAY = new Date(2026, 8, 22, 18, 0);

const gym = (performed_on: string, volume_kg: number, done = { warmup: true, stretch: true }): LoadSession => ({
  discipline: "gym",
  performed_on,
  distance_m: null,
  volume_kg,
  warmup_done: done.warmup,
  stretch_done: done.stretch,
});

const endurance = (
  discipline: "swim" | "run" | "bike",
  performed_on: string,
  distance_m: number,
): LoadSession => ({
  discipline,
  performed_on,
  distance_m,
  volume_kg: 0,
  warmup_done: false,
  stretch_done: false,
});

describe("loadPoints", () => {
  it("uses volume for gym and the agreed multipliers for the rest", () => {
    expect(loadPoints(gym("2026-09-22", 8000))).toBe(8);
    expect(loadPoints(endurance("swim", "2026-09-22", 2500))).toBeCloseTo(3);
    expect(loadPoints(endurance("run", "2026-09-22", 10000))).toBeCloseTo(5);
    expect(loadPoints(endurance("bike", "2026-09-22", 30000))).toBeCloseTo(3.6);
  });
});

describe("weekLoad", () => {
  it("adds up every discipline inside the week and ignores the rest", () => {
    const sessions = [
      gym("2026-09-21", 5000),
      endurance("swim", "2026-09-22", 2500),
      gym("2026-09-20", 9000), // previous week
    ];
    expect(weekLoad(sessions, "2026-09-21")).toBeCloseTo(8);
  });
});

describe("loadIndicator", () => {
  it("compares this week with the average of the three previous ones", () => {
    const sessions = [
      gym("2026-09-22", 6000), // this week: 6
      gym("2026-09-15", 4000), // 4
      gym("2026-09-08", 8000), // 8
      gym("2026-09-01", 6000), // 6 → baseline 6
    ];
    expect(loadIndicator(sessions, TODAY)).toMatchObject({ percent: 100, hasBaseline: true, baseline: 6 });
  });

  it("leaves empty weeks out of the average", () => {
    const sessions = [
      gym("2026-09-22", 9000), // this week: 9
      gym("2026-09-15", 6000), // one week back: 6, the others empty
    ];
    expect(loadIndicator(sessions, TODAY)).toMatchObject({ percent: 150, baseline: 6 });
  });

  it("shows 100% while there is no history to compare against", () => {
    expect(loadIndicator([gym("2026-09-22", 5000)], TODAY)).toMatchObject({ percent: 100, hasBaseline: false });
    expect(loadIndicator([], TODAY)).toMatchObject({ percent: 100, hasBaseline: false });
  });
});

describe("weekCompletion", () => {
  const goals = [
    { discipline: "gym" as const, target_sessions: 4 },
    { discipline: "swim" as const, target_sessions: 7 },
  ];

  it("counts sessions per discipline against the targets", () => {
    const sessions = [
      { discipline: "gym" as const, performed_on: "2026-09-21" },
      { discipline: "gym" as const, performed_on: "2026-09-22" },
      { discipline: "swim" as const, performed_on: "2026-09-22" },
    ];
    expect(weekCompletion(sessions, goals, TODAY).percent).toBe(27); // (2+1)/11
  });

  it("does not let one discipline make up for another", () => {
    const sessions = Array.from({ length: 9 }, () => ({ discipline: "gym" as const, performed_on: "2026-09-22" }));
    expect(weekCompletion(sessions, goals, TODAY).percent).toBe(36); // min(9,4)/11
  });

  it("returns zero when no goals are set", () => {
    expect(weekCompletion([], [], TODAY).percent).toBe(0);
  });
});

describe("regularity", () => {
  it("counts distinct days with any training in the last 14", () => {
    expect(regularity(["2026-09-22", "2026-09-21", "2026-09-16"], TODAY)).toBe(21); // 3/14
  });

  it("counts a day once even with two sessions", () => {
    expect(regularity(["2026-09-22", "2026-09-22"], TODAY)).toBe(7); // 1/14
  });

  it("ignores days older than 14", () => {
    expect(regularity(["2026-09-01"], TODAY)).toBe(0);
  });
});

describe("checklistRate", () => {
  it("counts only sessions with the whole list ticked", () => {
    const sessions = [
      { warmup_done: true, stretch_done: true },
      { warmup_done: true, stretch_done: false },
    ];
    expect(checklistRate(sessions, "warmup")).toBe(100);
    expect(checklistRate(sessions, "stretch")).toBe(50);
  });

  it("is zero without gym sessions", () => {
    expect(checklistRate([], "stretch")).toBe(0);
  });
});

describe("colours and verdict", () => {
  it("warns above and below the norm", () => {
    expect(loadTone(100)).toBe("green");
    expect(loadTone(115)).toBe("green");
    expect(loadTone(116)).toBe("yellow");
    expect(loadTone(146)).toBe("red");
    expect(loadTone(59)).toBe("yellow");
    expect(loadTone(60)).toBe("green");
  });

  it("uses the plain thresholds for the other rings", () => {
    expect(ringTone(70)).toBe("green");
    expect(ringTone(40)).toBe("yellow");
    expect(ringTone(39)).toBe("red");
  });

  it("picks the matching sentence", () => {
    expect(verdict({ percent: 150, hasBaseline: true, thisWeek: 9, baseline: 6 })).toBe("overreaching");
    expect(verdict({ percent: 120, hasBaseline: true, thisWeek: 7, baseline: 6 })).toBe("aboveNorm");
    expect(verdict({ percent: 100, hasBaseline: true, thisWeek: 6, baseline: 6 })).toBe("inNorm");
    expect(verdict({ percent: 40, hasBaseline: true, thisWeek: 2, baseline: 6 })).toBe("belowNorm");
    expect(verdict({ percent: 100, hasBaseline: false, thisWeek: 6, baseline: 0 })).toBe("collecting");
  });
});
