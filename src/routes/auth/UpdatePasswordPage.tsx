import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { PasswordField } from "../../components/ui/TextField";
import { useAuth } from "../../lib/auth/AuthProvider";
import { authErrorMessage, linkErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { initialAuthParams, supabase } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { MIN_PASSWORD } from "./RegisterPage";

/** Target of the password-reset email link. The link signs the user in first. */
export function UpdatePasswordPage() {
  const { session, finishRecovery } = useAuth();
  const navigate = useNavigate();
  const linkError = linkErrorMessage(initialAuthParams.errorCode);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(t.auth.passwordTooShort);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(authErrorMessage(error));
      return;
    }
    finishRecovery();
    navigate("/", { replace: true });
  }

  if (!session) {
    return (
      <AuthLayout title={t.auth.update.title}>
        <Notice tone="error">{linkError ?? t.auth.update.noSession}</Notice>
        <Link to="/reset-password" className="block text-center text-[13px] text-tx underline">
          {t.auth.update.requestNew}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.update.title}>
      <form onSubmit={submit} noValidate>
        <PasswordField
          label={t.auth.newPassword}
          hint={t.auth.passwordHint}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" busy={busy} disabled={!password}>
          {t.auth.update.submit}
        </Button>
      </form>
    </AuthLayout>
  );
}
