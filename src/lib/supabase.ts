import { createClient } from "@supabase/supabase-js";

// Read what an email link put in the URL *before* the client starts: it
// consumes and clears the fragment during initialisation.
function readAuthParams() {
  const params = new URLSearchParams(window.location.hash.slice(1) || window.location.search.slice(1));
  return {
    isRecovery: params.get("type") === "recovery",
    errorCode: params.get("error") || params.get("error_code") ? (params.get("error_code") ?? "unknown") : null,
  };
}

export const initialAuthParams = readAuthParams();

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && key);

// Implicit flow (tokens in the URL fragment) on purpose: email links then work
// even when opened on a different device than the one used to sign up. PKCE
// would require the same browser that started the flow.
export const supabase = createClient(url ?? "http://localhost", key ?? "missing", {
  auth: {
    flowType: "implicit",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const authRedirect = {
  callback: () => `${window.location.origin}/auth/callback`,
  updatePassword: () => `${window.location.origin}/update-password`,
};
