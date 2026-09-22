import type { ReactNode } from "react";

type Props = { tone?: "error" | "info" | "ok"; children: ReactNode };

const tones = {
  error: "border-red text-red",
  info: "border-line text-dim",
  ok: "border-green text-green",
} as const;

export function Notice({ tone = "info", children }: Props) {
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-3 rounded-[10px] border p-3 text-[13px] leading-snug ${tones[tone]}`}>
      {children}
    </div>
  );
}
