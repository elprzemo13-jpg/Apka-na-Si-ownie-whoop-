import { formatHeaderDate } from "../../lib/dates";
import { t } from "../../lib/i18n/pl";

export function Header() {
  return (
    <header className="safe-top sticky top-0 z-10 flex items-baseline justify-between border-b border-line bg-bg px-[18px] pb-[13px]">
      <span className="font-head text-xl font-bold tracking-[1.5px] uppercase">{t.app.name}</span>
      <span className="text-[11px] text-dim">{formatHeaderDate()}</span>
    </header>
  );
}
