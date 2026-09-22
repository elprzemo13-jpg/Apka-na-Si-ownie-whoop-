import type { ReactNode } from "react";
import { t } from "../../lib/i18n/pl";

/** Full-screen layout for signed-out screens: no navigation, brand on top. */
export function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="safe-top mx-auto min-h-dvh max-w-app px-4 pb-10">
      <div className="pt-10 pb-8 text-center">
        <div className="font-head text-[34px] font-bold tracking-[2px] uppercase">{t.app.name}</div>
        <div className="mt-1 text-[12px] text-dim">{t.auth.tagline}</div>
      </div>
      <div className="rounded-[20px] bg-panel px-4 py-6">
        <h1 className="mb-5 font-head text-[26px] font-bold tracking-[0.5px] uppercase">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export function AuthLinkRow({ children }: { children: ReactNode }) {
  return <div className="mt-5 text-center text-[13px] text-dim">{children}</div>;
}
