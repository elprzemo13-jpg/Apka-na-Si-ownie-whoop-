import { useState } from "react";
import { Button } from "./Button";
import { useAuth } from "../../lib/auth/AuthProvider";
import { toIsoDate } from "../../lib/dates";
import { collectExport } from "../../lib/export/collect";
import { buildCsv, csvFileName } from "../../lib/export/csv";
import { t } from "../../lib/i18n/pl";

/** Your data, in a file you can open in Excel — and read back into the app. */
export function ExportButton() {
  const { session } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    if (!session) return;
    setBusy(true);
    setMessage(null);
    const csv = buildCsv(await collectExport(session.user.id));
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = csvFileName(toIsoDate());
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(t.export.downloaded);
    } catch {
      // Some in-app browsers block downloads; the clipboard still works.
      try {
        await navigator.clipboard.writeText(csv);
        setMessage(t.export.copied);
      } catch {
        setMessage(t.export.failed);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <Button variant="ghost" busy={busy} onClick={() => void exportCsv()}>
        ⬇ {t.export.button}
      </Button>
      {message && <p className="mt-2 text-[11px] text-dim">{message}</p>}
    </div>
  );
}
