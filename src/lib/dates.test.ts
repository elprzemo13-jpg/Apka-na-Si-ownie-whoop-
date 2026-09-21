import { describe, expect, it } from "vitest";
import { isInWeek, toIsoDate, weekStart, weekdayIndex } from "./dates";

describe("weekStart", () => {
  it("returns Monday for a mid-week day", () => {
    expect(weekStart(new Date(2026, 8, 17))).toBe("2026-09-14"); // Thursday
  });
  it("treats Sunday as the last day of the week", () => {
    expect(weekStart(new Date(2026, 8, 20, 23, 30))).toBe("2026-09-14");
  });
  it("returns the same day for Monday", () => {
    expect(weekStart(new Date(2026, 8, 21, 0, 5))).toBe("2026-09-21");
  });
  it("goes back whole weeks", () => {
    expect(weekStart(new Date(2026, 8, 21), 3)).toBe("2026-08-31");
  });
  it("is stable across the DST change", () => {
    expect(weekStart(new Date(2026, 9, 26), 1)).toBe("2026-10-19");
  });
});

describe("isInWeek", () => {
  it("includes Monday and Sunday, excludes next Monday", () => {
    expect(isInWeek("2026-09-14", "2026-09-14")).toBe(true);
    expect(isInWeek("2026-09-20", "2026-09-14")).toBe(true);
    expect(isInWeek("2026-09-21", "2026-09-14")).toBe(false);
    expect(isInWeek("2026-09-13", "2026-09-14")).toBe(false);
  });
});

describe("helpers", () => {
  it("formats local dates without UTC shift", () => {
    expect(toIsoDate(new Date(2026, 0, 1, 0, 30))).toBe("2026-01-01");
  });
  it("maps Monday to 0 and Sunday to 6", () => {
    expect(weekdayIndex(new Date(2026, 8, 21))).toBe(0);
    expect(weekdayIndex(new Date(2026, 8, 27))).toBe(6);
  });
});
