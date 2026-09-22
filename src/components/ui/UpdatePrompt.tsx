import { useRegisterSW } from "virtual:pwa-register/react";
import { t } from "../../lib/i18n/pl";

/**
 * A new version waits until the user taps "Odśwież" — never mid-workout.
 * Also confirms, once, that the app is ready to work offline.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed inset-x-0 bottom-[calc(96px+env(safe-area-inset-bottom))] z-40 mx-auto max-w-app px-4">
      <div className="flex items-center gap-3 rounded-[12px] border border-line bg-up p-3 text-[13px]">
        <span className="flex-1">{needRefresh ? t.pwa.updateReady : t.pwa.offlineReady}</span>
        {needRefresh && (
          <button
            type="button"
            onClick={() => void updateServiceWorker(true)}
            className="min-h-tap rounded-[8px] bg-green px-3 font-bold text-black"
          >
            {t.pwa.reload}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOfflineReady(false);
            setNeedRefresh(false);
          }}
          aria-label={t.common.close}
          className="flex h-tap w-8 items-center justify-center text-dim"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
