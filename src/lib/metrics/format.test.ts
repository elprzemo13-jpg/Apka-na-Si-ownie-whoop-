import { describe, expect, it } from "vitest";
import { formatDistance, formatDuration, pacePer100m, pacePerKm, speedKmh } from "./format";

describe("pace", () => {
  it("gives swimming pace per 100 m", () => {
    expect(pacePer100m(2500, 3000)).toBe("2:00"); // 2500 m in 50 min
  });

  it("gives running pace per km", () => {
    expect(pacePerKm(10000, 3300)).toBe("5:30");
  });

  it("returns nothing without distance or time", () => {
    expect(pacePer100m(0, 1200)).toBeNull();
    expect(pacePerKm(5000, 0)).toBeNull();
  });
});

describe("speed", () => {
  it("gives average speed in km/h", () => {
    expect(speedKmh(30000, 3600)).toBe(30);
    expect(speedKmh(25500, 3600)).toBe(25.5);
  });

  it("returns nothing without distance or time", () => {
    expect(speedKmh(0, 3600)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats duration", () => {
    expect(formatDuration(1800)).toBe("30 min");
    expect(formatDuration(5400)).toBe("1 h 30 min");
  });

  it("counts metres for swimming and kilometres on land", () => {
    expect(formatDistance(2500, "swim")).toBe("2500 m");
    expect(formatDistance(10000, "run")).toBe("10 km");
    expect(formatDistance(12350, "bike")).toBe("12.35 km");
  });
});
