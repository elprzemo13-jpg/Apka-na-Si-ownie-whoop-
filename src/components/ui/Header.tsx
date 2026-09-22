import { Link } from "react-router";
import { useAuth } from "../../lib/auth/AuthProvider";
import { formatHeaderDate } from "../../lib/dates";
import { t } from "../../lib/i18n/pl";

export function Header() {
  const { profile } = useAuth();
  const initial = (profile?.display_name || profile?.username || "?").charAt(0).toUpperCase();
  return (
    <header className="safe-top sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg pr-2 pb-[5px] pl-[18px]">
      <span className="font-head text-xl font-bold tracking-[1.5px] uppercase">{t.app.name}</span>
      <span className="flex items-center gap-1">
        <span className="text-[11px] text-dim">{formatHeaderDate()}</span>
        <Link to="/settings" aria-label={t.settings.open} className="flex h-tap w-tap items-center justify-center">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-line font-head text-sm font-semibold text-dim">
            {initial}
          </span>
        </Link>
      </span>
    </header>
  );
}
