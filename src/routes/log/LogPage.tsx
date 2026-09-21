import { EmptyState } from "../../components/ui/EmptyState";
import { t } from "../../lib/i18n/pl";

export function LogPage() {
  return <EmptyState>{t.log.empty}</EmptyState>;
}
