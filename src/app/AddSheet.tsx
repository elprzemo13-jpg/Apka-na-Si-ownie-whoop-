import { useNavigate } from "react-router";
import { Sheet } from "../components/ui/Sheet";
import { t } from "../lib/i18n/pl";

type Props = { open: boolean; onClose: () => void };

// Gym is green, endurance disciplines are blue (DESIGN.md).
const options = [
  { key: "gym", color: "border-l-green", to: "/workout/gym", ...t.addSheet.gym },
  { key: "swim", color: "border-l-blue", to: "/workout/endurance?type=swim", ...t.addSheet.swim },
  { key: "run", color: "border-l-blue", to: "/workout/endurance?type=run", ...t.addSheet.run },
  { key: "bike", color: "border-l-blue", to: "/workout/endurance?type=bike", ...t.addSheet.bike },
] as const;

export function AddSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  return (
    <Sheet title={t.addSheet.title} open={open} onClose={onClose}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          disabled={option.to === null}
          onClick={() => {
            if (!option.to) return;
            onClose();
            navigate(option.to);
          }}
          className={`mb-2.5 flex w-full items-center justify-between rounded-[14px] border-l-[3px] bg-panel p-3.5 text-left ${option.color} disabled:opacity-45`}
        >
          <span>
            <span className="block font-head text-2xl font-bold uppercase">{option.name}</span>
            <span className="mt-[3px] block text-xs text-dim">{option.hint}</span>
          </span>
          {option.to === null && <span className="text-[11px] text-dim">{t.addSheet.soon}</span>}
        </button>
      ))}
    </Sheet>
  );
}
