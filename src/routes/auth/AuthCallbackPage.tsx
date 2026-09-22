import { Link, Navigate } from "react-router";
import { Notice } from "../../components/ui/Notice";
import { useAuth } from "../../lib/auth/AuthProvider";
import { linkErrorMessage } from "../../lib/auth/errors";
import { t } from "../../lib/i18n/pl";
import { initialAuthParams } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";

/**
 * Target of the sign-up confirmation link. Supabase confirms the address before
 * redirecting here and puts a session in the URL fragment, which the client
 * picks up on start. If the fragment is missing (link opened in a mail app's
 * preview, or already used) the address is usually confirmed anyway.
 */
export function AuthCallbackPage() {
  const { session } = useAuth();
  const linkError = linkErrorMessage(initialAuthParams.errorCode);

  if (session) return <Navigate to="/" replace />;

  return (
    <AuthLayout title={t.auth.login.title}>
      <Notice tone={linkError ? "error" : "ok"}>{linkError ?? t.auth.callback.confirmed}</Notice>
      <Link to="/login" className="block text-center text-[13px] text-tx underline">
        {t.auth.callback.toLogin}
      </Link>
    </AuthLayout>
  );
}
