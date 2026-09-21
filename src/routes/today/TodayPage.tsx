import { Link } from "react-router";
import { EmptyState } from "../../components/ui/EmptyState";
import { t } from "../../lib/i18n/pl";

export function TodayPage() {
  return (
    <EmptyState
      title={t.today.emptyTitle}
      action={
        <Link
          to="/plan"
          className="block w-full rounded-[10px] bg-green py-3.5 text-[15px] font-bold text-black"
        >
          {t.today.buildPlan}
        </Link>
      }
    >
      {t.today.emptyBody}
    </EmptyState>
  );
}
