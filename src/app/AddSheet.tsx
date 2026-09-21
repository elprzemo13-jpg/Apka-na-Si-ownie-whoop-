import { Sheet } from "../components/ui/Sheet";
import { t } from "../lib/i18n/pl";

type Props = { open: boolean; onClose: () => void };

// Gym is green, endurance disciplines are blue (DESIGN.md).
const options = [
  { key: "gym", color: "border-l-green", ...t.addSheet.gym },
  { key: "swim", color: "border-l-blue", ...t.addSheet.swim },
  { key: "run", color: "border-l-blue", ...t.addSheet.run },
  { key: "bike", color: "border-l-blue", ...t.addSheet.bike },
] as const;

export function AddSheet({ open, onClose }: Props) {
  return (
    <Sheet title={t.addSheet.title} open={open} onClose={onClose}>
      {options.map((o) => (
        // Forms arrive in E3 (gym) and E4 (endurance).
        <button
          key={o.key}
          type="button"
          disabled
          className={`mb-2.5 flex w-full items-center justify-between rounded-[14px] border-l-[3px] bg-panel p-3.5 text-left ${o.color}`}
        >
          <span>
            <span className="block font-head text-2xl font-bold uppercase">{o.name}</span>
            <span className="mt-[3px] block text-xs text-dim">{o.hint}</span>
          </span>
          <span className="text-[11px] text-dim">{t.addSheet.soon}</span>
        </button>
      ))}
    </Sheet>
  );
}
