import type { ReactNode } from "react";

type Props = { title?: string; children: ReactNode; action?: ReactNode };

export function EmptyState({ title, children, action }: Props) {
  return (
    <div className="px-[30px] py-[70px] text-center">
      {title && <div className="mb-2 font-head text-2xl font-bold tracking-[0.5px] uppercase">{title}</div>}
      <div className="text-sm leading-relaxed text-dim">{children}</div>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
