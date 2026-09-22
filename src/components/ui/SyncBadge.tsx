import { useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { pendingCount, runSync, syncStore } from "../../lib/data/syncService";
import { t } from "../../lib/i18n/pl";

/** Sync state, always visible: "saved" is not the same as "sent". */
export function SyncBadge() {
  const { status } = useSyncExternalStore(syncStore.subscribe, syncStore.getSnapshot);
  const pending = useLiveQuery(() => pendingCount(), [], 0) ?? 0;

  const [dot, text] =
    status === "offline"
      ? ["bg-yellow", pending > 0 ? t.sync.pending(pending) : t.sync.offline]
      : status === "error"
        ? ["bg-red", t.sync.error]
        : status === "syncing"
          ? ["bg-blue", t.sync.syncing]
          : pending > 0
            ? ["bg-yellow", t.sync.pending(pending)]
            : ["bg-green", t.sync.synced];

  return (
    <button
      type="button"
      onClick={() => void runSync()}
      className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-20 mx-auto flex h-7 w-full max-w-app items-center gap-2 border-t border-line bg-bg px-4 text-[11px] text-dim"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {text}
    </button>
  );
}
