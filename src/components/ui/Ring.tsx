import type { RingTone } from "../../lib/metrics/weekly";

const COLOURS: Record<RingTone | "blue", string> = {
  green: "var(--color-green)",
  yellow: "var(--color-yellow)",
  red: "var(--color-red)",
  blue: "var(--color-blue)",
};

type Props = {
  /** the number shown in the middle; may exceed 100 */
  value: number;
  tone: RingTone | "blue";
  label: string;
  sub?: string;
  size?: number;
  stroke?: number;
  suffix?: string;
};

/**
 * Progress ring: starts at the top, rounded ends, fills to 100% at most.
 * A load of 160% therefore shows a full red ring with 160 in the middle.
 */
export function Ring({ value, tone, label, sub, size = 190, stroke = 12, suffix = "%" }: Props) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  const colour = COLOURS[tone];

  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-head leading-none font-bold" style={{ fontSize: size * 0.34, color: colour }}>
          {value}
          <span style={{ fontSize: size * 0.14 }}>{suffix}</span>
        </div>
        <div className="mt-1.5 text-[11px] tracking-[0.5px] text-dim">{label}</div>
        {sub && <div className="mt-0.5 text-[10px] text-dim">{sub}</div>}
      </div>
    </div>
  );
}

/** Small ring used for the four secondary indicators. */
export function MiniRing({ value, tone, label }: { value: number; tone: RingTone | "blue"; label: string }) {
  const size = 72;
  const stroke = 6.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;
  const colour = COLOURS[tone];

  return (
    <div className="flex-1 rounded-[14px] bg-panel px-1 py-3 text-center">
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colour}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-head text-xl font-bold" style={{ color: colour }}>
            {value}
          </span>
        </div>
      </div>
      <div className="mt-1.5 text-[9px] text-dim">{label}</div>
    </div>
  );
}
