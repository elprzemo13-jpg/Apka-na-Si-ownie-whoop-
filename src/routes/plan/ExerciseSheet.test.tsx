// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ExerciseSheet } from "./ExerciseSheet";

afterEach(cleanup);

const setup = () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<ExerciseSheet open onClose={() => {}} onSave={onSave} />);
  return { onSave, user: userEvent.setup() };
};

const field = (label: RegExp) => screen.getByLabelText(label) as HTMLInputElement;

it("lets a number field be cleared and retyped", async () => {
  const { user } = setup();
  const sets = field(/^serie$/i);

  await user.clear(sets);
  expect(sets.value).toBe(""); // used to snap back to 1 on every keystroke

  await user.type(sets, "4");
  expect(sets.value).toBe("4");
});

it("saves the typed numbers", async () => {
  const { onSave, user } = setup();
  await user.type(field(/^nazwa$/i), "Przysiad");
  await user.clear(field(/^serie$/i));
  await user.type(field(/^serie$/i), "5");
  await user.clear(field(/od$/i));
  await user.type(field(/od$/i), "3");
  await user.clear(field(/^do$/i));
  await user.type(field(/^do$/i), "6");
  await user.click(screen.getByRole("button", { name: /^zapisz$/i }));

  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Przysiad", target_sets: 5, rep_min: 3, rep_max: 6 }),
  );
});

it("falls back to sane values when a field is left empty", async () => {
  const { onSave, user } = setup();
  await user.type(field(/^nazwa$/i), "Plank");
  await user.clear(field(/^serie$/i));
  await user.clear(field(/przerwa/i));
  await user.click(screen.getByRole("button", { name: /^zapisz$/i }));

  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ target_sets: 1, rest_s: null }));
});

it("refuses a reversed repetition range", async () => {
  const { onSave, user } = setup();
  await user.type(field(/^nazwa$/i), "Wiosłowanie");
  await user.clear(field(/^do$/i));
  await user.type(field(/^do$/i), "2");
  await user.click(screen.getByRole("button", { name: /^zapisz$/i }));

  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole("alert").textContent).toMatch(/zakres/i);
});
