import { useId, useState, type InputHTMLAttributes } from "react";
import { t } from "../../lib/i18n/pl";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
};

const inputClass =
  "w-full rounded-[9px] border border-line bg-up p-3 text-base text-tx outline-none focus:border-dim";

export function TextField({ label, hint, className = "", ...rest }: Props) {
  const id = useId();
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="mb-[7px] block text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
        {label}
      </label>
      <input id={id} className={inputClass} {...rest} />
      {hint && <div className="mt-1 text-[10.5px] text-dim">{hint}</div>}
    </div>
  );
}

/** Password input with a large show/hide toggle — easier than retyping with sweaty fingers. */
export function PasswordField({ label, hint, className = "", ...rest }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  return (
    <div className={`mb-3 ${className}`}>
      <label htmlFor={id} className="mb-[7px] block text-[10px] font-semibold tracking-[1.1px] text-dim uppercase">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={visible ? "text" : "password"} className={`${inputClass} pr-16`} {...rest} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 min-w-tap px-3 text-[12px] text-dim"
        >
          {visible ? t.auth.hidePassword : t.auth.showPassword}
        </button>
      </div>
      {hint && <div className="mt-1 text-[10.5px] text-dim">{hint}</div>}
    </div>
  );
}
