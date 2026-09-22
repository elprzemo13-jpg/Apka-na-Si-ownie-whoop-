import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { initialAuthParams, supabase } from "../supabase";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  sharing_level: "none" | "basic" | "full";
  invite_code: string;
};

type AuthState = {
  /** false until the stored session has been read */
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  /** the profile could not be loaded (offline on first start, or server error) */
  profileFailed: boolean;
  /** true after a password-reset link was opened, until the password is changed */
  recovering: boolean;
  refreshProfile: () => Promise<void>;
  finishRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// The last known profile is cached so the app still opens offline at the gym.
const cacheKey = (userId: string) => `trening.profile.${userId}`;

function readCachedProfile(userId: string): Profile | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    return raw ? (JSON.parse(raw) as Profile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(profile: Profile) {
  try {
    localStorage.setItem(cacheKey(profile.id), JSON.stringify(profile));
  } catch {
    // storage blocked: the app still works, it just needs the network on start
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  // The PASSWORD_RECOVERY event can fire before this component subscribes,
  // so the URL read at start-up is the primary signal.
  const [recovering, setRecovering] = useState(initialAuthParams.isRecovery);

  const loadProfile = useCallback(async (userId: string) => {
    const cached = readCachedProfile(userId);
    if (cached) setProfile(cached);
    setProfileFailed(false);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, sharing_level, invite_code")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      setProfile(data as Profile);
      writeCachedProfile(data as Profile);
    } else if (!cached) {
      if (error) console.warn("profile load failed", error.message);
      setProfileFailed(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setSession(next);
      if (!next) setProfile(null);
    });

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Load the profile when a user signs in after start-up.
  const userId = session?.user.id;
  useEffect(() => {
    if (ready && userId && profile?.id !== userId) void loadProfile(userId);
  }, [ready, userId, profile?.id, loadProfile]);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      profile,
      profileFailed,
      recovering,
      refreshProfile: async () => {
        if (session) await loadProfile(session.user.id);
      },
      finishRecovery: () => setRecovering(false),
      signOut: async () => {
        await supabase.auth.signOut();
        setProfile(null);
      },
    }),
    [ready, session, profile, profileFailed, recovering, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
