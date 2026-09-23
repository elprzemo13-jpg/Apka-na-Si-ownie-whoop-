import { useRef, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { useAuth } from "../../lib/auth/AuthProvider";
import { importSessions } from "../../lib/import/importSessions";
import { parseOldAppCsv, type ImportedSession } from "../../lib/import/oldAppCsv";
import { t } from "../../lib/i18n/pl";

/** One-time transfer of the history from the previous single-user app. */
export function ImportOldData() {
  const { session } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<{ sessions: ImportedSession[]; problems: string[] } | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File) {
    const text = await file.text();
    setSummary(null);
    setParsed(parseOldAppCsv(text));
  }

  const gymCount = parsed?.sessions.filter((s) => s.discipline === "gym").length ?? 0;
  const swimCount = (parsed?.sessions.length ?? 0) - gymCount;

  return (
    <div className="mb-5 rounded-[14px] bg-panel p-3">
      <div className="section-label mb-1">{t.importOld.title}</div>
      <p className="mb-3 text-[11px] leading-relaxed text-dim">{t.importOld.body}</p>

      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <Button variant="ghost" onClick={() => fileInput.current?.click()}>
        {t.importOld.pickFile}
      </Button>

      {parsed && parsed.sessions.length === 0 && (
        <div className="mt-3">
          <Notice tone="error">{parsed.problems[0] ?? t.importOld.nothingFound}</Notice>
        </div>
      )}

      {parsed && parsed.sessions.length > 0 && !summary && (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-dim">
            {t.importOld.found(gymCount, swimCount)}
            {parsed.problems.length > 0 && ` · ${t.importOld.problems(parsed.problems.length)}`}
          </p>
          <Button
            busy={busy}
            onClick={async () => {
              if (!session) return;
              setBusy(true);
              const result = await importSessions(session.user.id, parsed.sessions);
              setBusy(false);
              setSummary(t.importOld.done(result.imported, result.skipped));
              setParsed(null);
            }}
          >
            {t.importOld.confirm}
          </Button>
        </div>
      )}

      {summary && (
        <div className="mt-3">
          <Notice tone="ok">{summary}</Notice>
        </div>
      )}
    </div>
  );
}
