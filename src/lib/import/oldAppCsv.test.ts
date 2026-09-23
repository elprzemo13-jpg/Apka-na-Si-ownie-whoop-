import { describe, expect, it } from "vitest";
import { parseOldAppCsv } from "./oldAppCsv";

const HEADER =
  "data;typ;dzien;cwiczenie;seria;powtorzenia;kg;dystans_m;czas_min;tempo_100m;pod_woda_m;styl;charakter;rozgrzewka;rozciaganie;notatki";

const csv = (...rows: string[]) => `﻿${[HEADER, ...rows].join("\n")}`;

describe("parseOldAppCsv", () => {
  it("groups the repeated gym rows back into one session", () => {
    const result = parseOldAppCsv(
      csv(
        "2026-09-14;silownia;D1;Przysiad ze sztangą;1;6;60;;;;;;;1;1;",
        "2026-09-14;silownia;D1;Przysiad ze sztangą;2;6;60;;;;;;;1;1;",
        "2026-09-14;silownia;D1;Plank;1;40;0;;;;;;;1;1;",
      ),
    );

    expect(result.problems).toEqual([]);
    expect(result.sessions).toHaveLength(1);
    const session = result.sessions[0]!;
    if (session.discipline !== "gym") throw new Error("expected a gym session");
    expect(session).toMatchObject({ performedOn: "2026-09-14", dayLabel: "D1", warmupDone: true, stretchDone: true });
    expect(session.exercises.map((e) => e.name)).toEqual(["Przysiad ze sztangą", "Plank"]);
    expect(session.exercises[0]!.sets).toEqual([
      { reps: 6, weightKg: 60 },
      { reps: 6, weightKg: 60 },
    ]);
    // A zero in the old export means "no weight", not zero kilograms.
    expect(session.exercises[1]!.sets).toEqual([{ reps: 40, weightKg: null }]);
  });

  it("keeps two training days on the same date apart", () => {
    const result = parseOldAppCsv(
      csv(
        "2026-09-14;silownia;D1;Przysiad;1;6;60;;;;;;;1;1;",
        "2026-09-14;silownia;D2;Podciąganie;1;8;0;;;;;;;0;0;",
      ),
    );
    expect(result.sessions).toHaveLength(2);
  });

  it("reads a swimming session with pace, style and notes", () => {
    const result = parseOldAppCsv(
      csv("2026-09-15;woda;;;;;;2500;50;2:00;300;Kraul;Technika;;;20x50 kraul"),
    );
    expect(result.sessions[0]).toEqual({
      discipline: "swim",
      performedOn: "2026-09-15",
      distanceM: 2500,
      durationS: 3000,
      underwaterM: 300,
      style: "Kraul",
      sessionType: "Technika",
      notes: "20x50 kraul",
    });
  });

  it("reports unusable rows instead of dropping them silently", () => {
    const result = parseOldAppCsv(
      csv(
        "brak-daty;silownia;D1;Przysiad;1;6;60;;;;;;;1;1;",
        "2026-09-14;woda;;;;;;;;;;;;;;",
        "2026-09-14;joga;;;;;;5000;25;;;;;;;",
      ),
    );
    expect(result.sessions).toHaveLength(0);
    expect(result.problems).toHaveLength(3);
    expect(result.problems[2]).toMatch(/nieznany typ/);
  });

  it("refuses a file that is not the old export", () => {
    expect(parseOldAppCsv("imię;nazwisko\nJan;Kowalski").problems[0]).toMatch(/nie wygląda/);
    expect(parseOldAppCsv("").problems[0]).toMatch(/pusty/);
  });

  it("sorts sessions from oldest to newest", () => {
    const result = parseOldAppCsv(
      csv(
        "2026-09-20;silownia;D2;Wiosłowanie;1;10;40;;;;;;;1;0;",
        "2026-09-14;woda;;;;;;2000;40;2:00;;Grzbiet;Wytrzymałość;;;",
      ),
    );
    expect(result.sessions.map((s) => s.performedOn)).toEqual(["2026-09-14", "2026-09-20"]);
  });
});
