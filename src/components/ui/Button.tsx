import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  busy?: boolean;
};

const styles = {
  primary: "bg-green text-black font-bold text-[15px] py-3.5",
  ghost: "border border-line text-dim font-semibold text-[13px] py-3",
  danger: "border border-red text-red font-semibold text-[13px] py-3",
} as const;

export function Button({ variant = "primary", busy, disabled, className = "", children, ...rest }: Props) {
  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={`min-h-tap w-full rounded-[10px] disabled:opacity-35 ${styles[variant]} ${className}`}
      {...rest}
    >
      {busy ? "…" : children}
    </button>
  );
}
