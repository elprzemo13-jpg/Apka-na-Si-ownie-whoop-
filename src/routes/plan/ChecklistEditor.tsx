import { useState } from "react";
import { addChecklistItem, updateChecklistItem } from "../../lib/data/planActions";
import { useChecklist } from "../../lib/data/queries";
import { remove } from "../../lib/data/repo";
import { t } from "../../lib/i18n/pl";
import type { ChecklistKind } from "../../lib/data/types";

type Props = {
  planId: string;
  dayId: string | null;
  kind: ChecklistKind;
  title: string;
  hint: string;
  /** offered only while the list is empty */
  presets?: { label: string; onInsert: () => void }[];
};

export function ChecklistEditor({ planId, dayId, kind, title, hint, presets }: Props) {
  const items = useChecklist(planId, kind, dayId);
  const [draft, setDraft] = useState("");
  const accent = kind === "warmup" ? "text-yellow" : "text-blue";

  async function add() {
    const label = draft.trim();
    if (!label) return;
    await addChecklistItem(planId, dayId, kind, label);
    setDraft(""); // input keeps focus: adding several items in a row is normal
  }

  return (
    <section className="mb-6">
      <div className={`section-label mb-1 ${accent}`}>{title}</div>
      <p className="mb-2.5 text-[11px] text-dim">{hint}</p>
      {presets && items?.length === 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={preset.onInsert}
              className="min-h-tap rounded-full border border-dashed border-line px-3.5 text-[12px] text-dim"
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-[14px] bg-panel p-2">
        {items?.map((item) => (
          <div key={item.id} className="flex items-center gap-2 border-b border-line last:border-b-0">
            <input
              defaultValue={item.label}
              onBlur={(e) => {
                const label = e.target.value.trim();
                if (label && label !== item.label) void updateChecklistItem(item, { label });
                else e.target.value = item.label;
              }}
              className="min-h-tap flex-1 bg-transparent px-2 text-[14px] outline-none"
            />
            <button
              type="button"
              aria-label={t.plan.remove}
              onClick={() => void remove("plan_checklist_items", item.id)}
              className="flex h-tap w-tap items-center justify-center text-[15px] text-dim"
            >
              ✕
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
            placeholder={t.plan.itemPlaceholder}
            className="min-h-tap flex-1 bg-transparent px-2 text-[14px] outline-none"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={!draft.trim()}
            className={`flex h-tap w-tap items-center justify-center text-[20px] disabled:opacity-30 ${accent}`}
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}
