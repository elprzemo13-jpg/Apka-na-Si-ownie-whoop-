import { useLiveQuery } from "dexie-react-hooks";
import { runSync, syncDiagnostics } from "../../lib/data/syncService";
import { t } from "../../lib/i18n/pl";

/** Plain view of the sync queue: what is stuck, and the server's reason. */
export function SyncDiagnostics() {
  const info = useLiveQuery(() => syncDiagnostics(), []);
  if (!info) return null;

  return (
    <div className="mb-5 rounded-[14px] bg-panel p-3">
      <div className="section-label mb-2">{t.settings.sync}</div>
      <div className="text-[12px] leading-relaxed text-dim">
        <div>
          {t.settings.pending}: {info.pending}
          {info.byTable.length > 0 && ` (${info.byTable.join(", ")})`}
        </div>
        <div>
          {t.settings.stored}: {info.rows.sessions} / {info.rows.exercises} / {info.rows.sets}
        </div>
        <div>
          {t.settings.lastSync}: {info.lastSyncAt ? new Date(info.lastSyncAt).toLocaleTimeString("pl-PL") : "—"}
        </div>
        {info.lastError && (
          <div className="mt-1 text-red">
            {info.lastErrorTable}: {info.lastError}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => void runSync()}
        className="mt-2 min-h-tap w-full rounded-[10px] border border-line text-[12px] text-dim"
      >
        {t.settings.syncNow}
      </button>
    </div>
  );
}
