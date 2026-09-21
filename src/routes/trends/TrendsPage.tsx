import { EmptyState } from "../../components/ui/EmptyState";
import { t } from "../../lib/i18n/pl";

export function TrendsPage() {
  return <EmptyState>{t.trends.empty}</EmptyState>;
}
