import { describe, expect, it } from "vitest";
import { suggestDay } from "./schedule";

// Owner's plan: D1 Monday, D2 Tuesday, D3 Thursday, D4 Friday.
const days = [
  { id: "d1", weekdays: [0] },
  { id: "d2", weekdays: [1] },
  { id: "d3", weekdays: [3] },
  { id: "d4", weekdays: [4] },
];

describe("suggestDay", () => {
  it("picks the day assigned to today", () => {
    expect(suggestDay(days, 3, null)).toEqual({ dayId: "d3", scheduledToday: true });
  });

  it("on a rest day offers the day after the last one trained", () => {
    expect(suggestDay(days, 2, "d2")).toEqual({ dayId: "d3", scheduledToday: false });
    expect(suggestDay(days, 6, "d4")).toEqual({ dayId: "d1", scheduledToday: false }); // wraps around
  });

  it("starts from the first day when nothing was trained yet", () => {
    expect(suggestDay(days, 5, null)).toEqual({ dayId: "d1", scheduledToday: false });
  });

  it("rotates through a plan with no weekdays at all", () => {
    const rotation = [{ id: "a", weekdays: [] }, { id: "b", weekdays: [] }, { id: "c", weekdays: [] }];
    expect(suggestDay(rotation, 0, "b")).toEqual({ dayId: "c", scheduledToday: false });
  });

  it("has nothing to offer without days", () => {
    expect(suggestDay([], 0, null)).toEqual({ dayId: null, scheduledToday: false });
  });
});
