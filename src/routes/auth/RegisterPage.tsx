import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { Button } from "../../components/ui/Button";
import { Notice } from "../../components/ui/Notice";
import { PasswordField, TextField } from "../../components/ui/TextField";
import { authErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { authRedirect, supabase } from "../../lib/supabase";
import { AuthLayout, AuthLinkRow } from "./AuthLayout";

export const MIN_PASSWORD = 8;

export function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      setError(t.auth.passwordTooShort);
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirect.callback() },
    });
    setBusy(false);
    // Supabase answers the same way for an already registered address, so the
    // form can't be used to check who has an account.
    if (error) setError(authErrorMessage(error));
    else setSentTo(email.trim());
  }

  if (sentTo) {
    return (
      <AuthLayout title={t.auth.checkEmail.title}>
        <p className="mb-5 text-sm leading-relaxed text-dim">{t.auth.checkEmail.body(sentTo)}</p>
        <Link to="/login" className="block text-center text-[13px] text-tx underline">
          {t.auth.checkEmail.back}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t.auth.register.title}>
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
          hint={t.auth.passwordHint}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <Notice tone="error">{error}</Notice>}
        <Button type="submit" busy={busy} disabled={!email || !password}>
          {t.auth.register.submit}
        </Button>
      </form>
      <AuthLinkRow>
        {t.auth.register.haveAccount}{" "}
        <Link to="/login" className="font-semibold text-green">
          {t.auth.register.toLogin}
        </Link>
      </AuthLinkRow>
    </AuthLayout>
  );
}
