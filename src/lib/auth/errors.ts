import { t } from "../i18n/pl";

type MaybeError = { code?: string; status?: number; name?: string; message?: string } | null | undefined;

/** Maps Supabase auth / PostgREST errors to a Polish message for the user. */
export function authErrorMessage(error: MaybeError): string {
  if (!error) return t.errors.generic;
  if (error.name === "AuthRetryableFetchError" || error.status === 0 || !navigator.onLine) {
    return t.errors.offline;
  }
  switch (error.code) {
    case "invalid_credentials":
      return t.errors.invalidCredentials;
    case "email_not_confirmed":
      return t.errors.emailNotConfirmed;
    case "weak_password":
      return t.errors.weakPassword;
    case "same_password":
      return t.errors.samePassword;
    case "over_email_send_rate_limit":
      return t.errors.emailRateLimit;
    case "over_request_rate_limit":
      return t.errors.rateLimit;
    case "otp_expired":
      return t.errors.linkExpired;
    case "23505":
      return t.errors.usernameTaken;
    case "23514":
      return t.errors.usernameFormat;
    default:
      return t.errors.generic;
  }
}

/** Message for an error Supabase put in an email link, e.g. an expired link. */
export function linkErrorMessage(errorCode: string | null): string | null {
  return errorCode ? authErrorMessage({ code: errorCode }) : null;
}
