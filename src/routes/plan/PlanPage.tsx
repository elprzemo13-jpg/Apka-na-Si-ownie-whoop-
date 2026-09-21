import { EmptyState } from "../../components/ui/EmptyState";
import { t } from "../../lib/i18n/pl";

export function PlanPage() {
  return <EmptyState title={t.plan.emptyTitle}>{t.plan.emptyBody}</EmptyState>;
}
