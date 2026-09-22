// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

// The screen only needs the user id from the auth context.
vi.mock("../../lib/auth/AuthProvider", () => ({
  useAuth: () => ({ session: { user: { id: "u1" } } }),
}));

const { db } = await import("../../lib/data/local");
const { newRow } = await import("../../lib/data/repo");
const { TodayPage } = await import("./TodayPage");
const { toIsoDate } = await import("../../lib/dates");

const today = toIsoDate();

async function seedGymSession(volumeKg: number) {
  const session = newRow({
    user_id: "u1",
    discipline: "gym" as const,
    performed_on: today,
    plan_day_id: null,
    day_label_snapshot: "D1 Nogi",
    distance_m: null,
    duration_s: null,
    session_type: null,
    swim_style: null,
    underwater_m: null,
    notes: null,
    warmup_done: true,
    stretch_done: false,
  });
  await db.sessions.put(session);
  const exercise = newRow({
    session_id: session.id,
    exercise_id: "ex-1",
    position: 0,
    name_snapshot: "Przysiad",
    skipped: false,
    target_sets: 3,
    rep_min: 5,
    rep_max: 6,
    rep_unit: "reps" as const,
    per_side: false,
  });
  await db.session_exercises.put(exercise);
  await db.session_sets.put(
    newRow({
      session_exercise_id: exercise.id,
      set_no: 1,
      reps: 10,
      weight_kg: volumeKg / 10,
      height_cm: null,
      is_extra: false,
    }),
  );
}

beforeEach(async () => {
  await Promise.all(db.tables.map((table) => table.clear()));
});

afterEach(cleanup);

const renderToday = () =>
  render(
    <MemoryRouter>
      <TodayPage />
    </MemoryRouter>,
  );

it("explains what will appear when there are no sessions yet", async () => {
  renderToday();
  await waitFor(() => expect(screen.getByText(/Tu pojawią się Twoje wskaźniki/i)).toBeDefined());
});

it("shows the rings once a workout exists", async () => {
  await seedGymSession(6000);
  await db.weekly_goals.put(
    newRow({ user_id: "u1", discipline: "gym" as const, target_sessions: 4 }),
  );
  renderToday();

  await waitFor(() => expect(screen.getByText(/REALIZACJA TYGODNIA/i)).toBeDefined());
  expect(screen.getByText("25")).toBeDefined(); // one of four gym sessions
  expect(screen.getByText(/1\/4 siłownia/i)).toBeDefined();
  // No baseline yet: load shows 100% and says it is still collecting data.
  expect(screen.getByText(/Zbierz kilka wpisów/i)).toBeDefined();
  expect(screen.getByText(/OBCIĄŻENIE/i)).toBeDefined();
});

it("renders without goals instead of crashing", async () => {
  await seedGymSession(3000);
  renderToday();
  await waitFor(() => expect(screen.getByText(/Ustaw cele tygodniowe/i)).toBeDefined());
});
