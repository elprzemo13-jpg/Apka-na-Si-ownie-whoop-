import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { TextField } from "../../components/ui/TextField";
import { authErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { authRedirect, supabase } from "../../lib/supabase";
import { AuthLayout, AuthLinkRow } from "./AuthLayout";

export function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: authRedirect.updatePassword(),
    });
    setBusy(false);
    if (error) setError(authErrorMessage(error));
    else setSent(true);
  }

  return (
    <AuthLayout title={t.auth.reset.title}>
      {sent ? (
        <Notice tone="ok">{t.auth.reset.sent}</Notice>
      ) : (
        <form onSubmit={submit} noValidate>
          <p className="mb-4 text-[13px] leading-relaxed text-dim">{t.auth.reset.body}</p>
          <TextField
            label={t.auth.email}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" busy={busy} disabled={!email}>
            {t.auth.reset.submit}
          </Button>
        </form>
      )}
      <AuthLinkRow>
        <Link to="/login" className="inline-block min-h-tap py-3 text-tx underline">
          {t.auth.reset.back}
        </Link>
      </AuthLinkRow>
    </AuthLayout>
  );
}
