import { useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { PasswordField, TextField } from "../../components/ui/TextField";
import { authErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { authRedirect, supabase } from "../../lib/supabase";
import { AuthLayout, AuthLinkRow } from "./AuthLayout";

export function LoginPage() {
  const location = useLocation();
  const notice = (location.state as { notice?: string } | null)?.notice;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResent(false);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    // On success AuthProvider picks up the session and the guard redirects.
    if (error) {
      setError(authErrorMessage(error));
      setUnconfirmed(error.code === "email_not_confirmed");
    }
  }

  async function resend() {
    setBusy(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
      options: { emailRedirectTo: authRedirect.callback() },
    });
    setBusy(false);
    if (error) setError(authErrorMessage(error));
    else setResent(true);
  }

  return (
    <AuthLayout title={t.auth.login.title}>
      {notice && <Notice tone="ok">{notice}</Notice>}
      <form onSubmit={submit} noValidate>
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
        <PasswordField
          label={t.auth.password}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Notice tone="error">{error}</Notice>}
        {resent && <Notice tone="ok">{t.auth.login.resent}</Notice>}
        <Button type="submit" busy={busy} disabled={!email || !password}>
          {t.auth.login.submit}
        </Button>
        {unconfirmed && !resent && (
          <Button variant="ghost" className="mt-2" onClick={resend} busy={busy}>
            {t.auth.login.resend}
          </Button>
        )}
      </form>
      <AuthLinkRow>
        <Link to="/reset-password" className="inline-block min-h-tap py-3 text-tx underline">
          {t.auth.login.forgot}
        </Link>
      </AuthLinkRow>
      <AuthLinkRow>
        {t.auth.login.noAccount}{" "}
        <Link to="/register" className="font-semibold text-green">
          {t.auth.login.toRegister}
        </Link>
      </AuthLinkRow>
    </AuthLayout>
  );
}
