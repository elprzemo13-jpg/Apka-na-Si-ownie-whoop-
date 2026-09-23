import { describe, expect, it } from "vitest";
import { buildCsv, CSV_COLUMNS, type ExportSession } from "./csv";
import { parseOldAppCsv } from "../import/oldAppCsv";

const gym: ExportSession = {
  performed_on: "2026-09-21",
  discipline: "gym",
  day_label: "D1 Nogi",
  distance_m: null,
  duration_s: null,
  session_type: null,
  swim_style: null,
  underwater_m: null,
  notes: null,
  warmup_done: true,
  stretch_done: false,
  exercises: [
    {
      name: "Przysiad ze sztangą",
      skipped: false,
      sets: [
        { reps: 6, weight_kg: 60, height_cm: null },
        { reps: 5, weight_kg: 60, height_cm: null },
      ],
    },
    { name: "Wyskoki na skrzynię", skipped: true, sets: [] },
  ],
};

const swim: ExportSession = {
  performed_on: "2026-09-22",
  discipline: "swim",
  day_label: null,
  distance_m: 2500,
  duration_s: 3000,
  session_type: "Technika",
  swim_style: "Kraul",
  underwater_m: 300,
  notes: "20×50; kraul\nz przerwą",
  warmup_done: false,
  stretch_done: false,
  exercises: [],
};

const lines = (csv: string) => csv.replace(/^﻿/, "").split("\n");

describe("buildCsv", () => {
  it("starts with a byte order mark and the header", () => {
    const csv = buildCsv([]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(lines(csv)[0]).toBe(CSV_COLUMNS.join(";"));
  });

  it("writes one row per set and keeps a skipped exercise", () => {
    const rows = lines(buildCsv([gym])).slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toContain("2026-09-21;silownia;D1 Nogi;Przysiad ze sztangą;1;6;60");
    expect(rows[1]).toContain(";2;5;60");
    expect(rows[2]).toContain("pominiete");
    expect(rows[0]!.endsWith(";1;0;")).toBe(true); // warm-up done, stretching not
  });

  it("writes pace for swimming and speed for cycling", () => {
    const swimRow = lines(buildCsv([swim]))[1]!;
    expect(swimRow).toContain("plywanie");
    expect(swimRow).toContain("2500;50;2:00");
    expect(swimRow).toContain("300;Kraul;Technika");

    const bikeRow = lines(buildCsv([{ ...swim, discipline: "bike", distance_m: 30000, duration_s: 3600 }]))[1]!;
    expect(bikeRow).toContain("rower");
    expect(bikeRow).toContain(";30");
  });

  it("never lets a note break the row", () => {
    const row = lines(buildCsv([swim]))[1]!;
    expect(row.split(";")).toHaveLength(CSV_COLUMNS.length);
    expect(row).toContain("20×50 kraul z przerwą");
  });

  it("sorts sessions from oldest to newest", () => {
    const rows = lines(buildCsv([swim, gym])).slice(1);
    expect(rows[0]).toContain("2026-09-21");
    expect(rows[rows.length - 1]).toContain("2026-09-22");
  });

  it("can be read back by the import, so an export is also a backup", () => {
    const parsed = parseOldAppCsv(buildCsv([gym, swim]));
    expect(parsed.problems).toEqual([]);
    expect(parsed.sessions).toHaveLength(2);
    const [first, second] = parsed.sessions;
    if (first?.discipline !== "gym" || second?.discipline !== "swim") throw new Error("wrong order");
    expect(first.exercises[0]!.sets).toEqual([
      { reps: 6, weightKg: 60 },
      { reps: 5, weightKg: 60 },
    ]);
    expect(second).toMatchObject({ distanceM: 2500, durationS: 3000, style: "Kraul" });
  });
});
