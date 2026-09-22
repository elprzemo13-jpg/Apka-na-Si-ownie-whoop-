import { useState } from "react";
import type { ChecklistDraft } from "../../lib/data/workoutActions";

type Props = {
  title: string;
  kind: "warmup" | "stretch";
  items: ChecklistDraft[];
  emptyText: string;
  onToggle: (index: number) => void;
};

/** Collapsible checklist; the border turns to the section colour once every
 *  item is ticked, so progress is visible without reading. */
export function ChecklistBlock({ title, kind, items, emptyText, onToggle }: Props) {
  const [open, setOpen] = useState(true);
  const mine = items.map((item, index) => ({ item, index })).filter((e) => e.item.kind === kind);
  const allDone = mine.length > 0 && mine.every((e) => e.item.done);
  // Written out, not built from a variable: Tailwind only sees literal classes.
  const text = kind === "warmup" ? "text-yellow" : "text-blue";
  const border = allDone ? (kind === "warmup" ? "border-yellow" : "border-blue") : "border-line";

  return (
    <div className={`mb-3 rounded-[12px] border bg-panel p-3 ${border}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-h-tap w-full items-center justify-between">
        <span className={`text-[10.5px] font-semibold tracking-[0.9px] uppercase ${text}`}>
          {kind === "warmup" ? "🔥" : "🧘"} {title}
          {allDone && " ✓"}
        </span>
        <span className="text-dim">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2">
          {mine.length === 0 && <p className="py-2 text-[12px] text-dim">{emptyText}</p>}
          {mine.map(({ item, index }) => (
            <button
              key={index}
              type="button"
              onClick={() => onToggle(index)}
              className="flex w-full items-start gap-2.5 py-2 text-left"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border-[1.5px] text-[12px] text-black ${
                  item.done
                    ? kind === "warmup"
                      ? "border-yellow bg-yellow"
                      : "border-blue bg-blue"
                    : "border-line"
                }`}
              >
                {item.done ? "✓" : ""}
              </span>
              <span className={`text-[13px] ${item.done ? "text-dim line-through" : ""}`}>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
