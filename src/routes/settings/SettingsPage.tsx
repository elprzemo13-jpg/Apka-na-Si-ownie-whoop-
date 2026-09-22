import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { useAuth } from "../../lib/auth/AuthProvider";
import { t } from "../../lib/i18n/pl";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line p-3 last:border-b-0">
      <span className="text-[13px] text-dim">{label}</span>
      <span className="text-[14px]">{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const { session, profile, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <div className="px-4 pt-5 pb-2.5">
      <div className="section-label mb-2.5">{t.settings.title}</div>
      <div className="mb-5 rounded-[14px] bg-panel px-1 py-1">
        <Row label={t.settings.email} value={session?.user.email ?? "—"} />
        <Row label={t.settings.username} value={profile?.username ? `@${profile.username}` : "—"} />
        <Row label={t.settings.inviteCode} value={profile?.invite_code ?? "—"} />
      </div>
      <Button
        variant="ghost"
        busy={busy}
        onClick={async () => {
          setBusy(true);
          await signOut();
        }}
      >
        {t.settings.signOut}
      </Button>
    </div>
  );
}
