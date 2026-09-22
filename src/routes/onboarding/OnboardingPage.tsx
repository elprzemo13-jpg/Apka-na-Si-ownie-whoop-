import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { TextField } from "../../components/ui/TextField";
import { useAuth } from "../../lib/auth/AuthProvider";
import { authErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { supabase } from "../../lib/supabase";
import { AuthLayout } from "../auth/AuthLayout";

// Same rule as the profiles.username check constraint.
export const USERNAME_RE = /^[a-z0-9_]{3,24}$/;

export function OnboardingPage() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (profile?.username) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!session) return;
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setError(t.errors.usernameFormat);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: name,
        display_name: displayName.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    if (error) {
      setBusy(false);
      setError(authErrorMessage(error));
      return;
    }
    await refreshProfile();
    setBusy(false);
    navigate("/", { replace: true });
  }

  return (
    <AuthLayout title={t.onboarding.title}>
      <p className="mb-5 text-[13px] leading-relaxed text-dim">{t.onboarding.body}</p>
      <form onSubmit={submit} noValidate>
        <TextField
          label={t.onboarding.username}
          hint={t.onboarding.usernameHint}
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          spellCheck={false}
          maxLength={24}
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          required
        />
        <TextField
          label={t.onboarding.displayName}
          autoComplete="given-name"
          maxLength={40}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" busy={busy} disabled={!username}>
          {t.onboarding.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
