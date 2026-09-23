import { NavLink } from "react-router";
import { t } from "../../lib/i18n/pl";

type Props = { onAdd: () => void };

const tabs = [
  { to: "/", label: t.nav.today, end: true },
  { to: "/plan", label: t.nav.plan },
  { to: "/log", label: t.nav.log },
  { to: "/friends", label: t.nav.friends },
] as const;

function Tab({ to, label, end }: { to: string; label: string; end?: boolean }) {
  return (
    <NavLink to={to} end={end} className="flex h-tap flex-1 items-center justify-center">
      {({ isActive }) => (
        <span
          className={`border-b-2 pb-[3px] font-head text-sm font-semibold tracking-[0.8px] uppercase ${
            isActive ? "border-green text-tx" : "border-transparent text-dim"
          }`}
        >
          {label}
        </span>
      )}
    </NavLink>
  );
}

export function BottomNav({ onAdd }: Props) {
  const [today, plan, log, friends] = tabs;
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-app items-center border-t border-line bg-bg pt-2.5">
      <Tab {...today} />
      <Tab {...plan} />
      <div className="flex flex-1 justify-center">
        <button
          type="button"
          onClick={onAdd}
          aria-label={t.nav.add}
          className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-green text-[26px] leading-none font-light text-black"
        >
          +
        </button>
      </div>
      <Tab {...log} />
      <Tab {...friends} />
    </nav>
  );
}
