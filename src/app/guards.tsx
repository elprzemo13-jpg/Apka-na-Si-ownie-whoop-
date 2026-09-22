import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../lib/auth/AuthProvider";
import { Button } from "../components/ui/Button";
import { t } from "../lib/i18n/pl";

function Splash() {
  return <div className="flex min-h-dvh items-center justify-center text-sm text-dim">{t.common.loading}</div>;
}

/** Signed-in area. Sends a recovering user to set a new password first. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { ready, session, recovering } = useAuth();
  const location = useLocation();
  if (!ready) return <Splash />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (recovering) return <Navigate to="/update-password" replace />;
  return children;
}

/** App screens need a username; new accounts go through onboarding first. */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile, profileFailed, refreshProfile } = useAuth();
  if (!profile && profileFailed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-app flex-col items-center justify-center px-8 text-center">
        <div className="mb-5 text-sm leading-relaxed text-dim">{t.errors.profileLoad}</div>
        <Button onClick={() => void refreshProfile()}>{t.common.retry}</Button>
      </div>
    );
  }
  if (!profile) return <Splash />;
  if (!profile.username) return <Navigate to="/onboarding" replace />;
  return children;
}

/** Signed-out screens (login, register, reset) bounce signed-in users home. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { ready, session } = useAuth();
  if (!ready) return <Splash />;
  if (session) return <Navigate to="/" replace />;
  return children;
}
