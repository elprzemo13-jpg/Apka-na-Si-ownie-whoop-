type Props = {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: "green" | "blue";
};

/** Round toggle used for weekdays, plan days and discipline pickers. */
export function Chip({ label, active, onClick, color = "green" }: Props) {
  const on = color === "green" ? "border-green text-green bg-green/12" : "border-blue text-blue bg-blue/12";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-tap rounded-full border px-3.5 text-[13px] ${active ? on : "border-line text-dim"}`}
    >
      {label}
    </button>
  );
}
