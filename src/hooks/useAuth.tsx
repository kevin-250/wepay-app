import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  national_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  language: string;
  notify_email: boolean;
  notify_sms: boolean;
  notify_inapp: boolean;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
};

type AuthCtx = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  homeTo: "/admin" | "/dashboard";
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = async (uid: string) => {
    const [{ data }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((data as Profile) ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
  };

  useEffect(() => {
    let cancelled = false;

    const applySession = (sess: Session | null, reloadProfile: boolean) => {
      setSession(sess);
      setUser(sess?.user ?? null);

      // Defer extra Supabase calls — invoking them inside onAuthStateChange can deadlock.
      setTimeout(() => {
        void (async () => {
          if (sess?.user) {
            if (reloadProfile) {
              await loadProfile(sess.user.id);
              userIdRef.current = sess.user.id;
            }
          } else {
            userIdRef.current = null;
            setProfile(null);
            setIsAdmin(false);
          }
          if (!cancelled) setLoading(false);
        })();
      }, 0);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      const nextId = sess?.user?.id ?? null;
      const sameUser = nextId != null && nextId === userIdRef.current;

      // Tab focus / token recovery re-emits SIGNED_IN. Keep the UI mounted and skip extra fetches.
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || (event === "SIGNED_IN" && sameUser)) {
        setSession(sess);
        setUser(sess?.user ?? null);
        return;
      }

      if (event === "INITIAL_SESSION" && sameUser) {
        setSession(sess);
        setUser(sess?.user ?? null);
        if (!cancelled) setLoading(false);
        return;
      }

      const isNewSignIn = event === "SIGNED_IN" && !sameUser && !!nextId;
      const isInitial = event === "INITIAL_SESSION" && !!nextId;
      if (isNewSignIn || isInitial) setLoading(true);

      userIdRef.current = nextId;
      applySession(sess, !!nextId);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) await loadProfile(user.id);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    userIdRef.current = null;
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <Ctx.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        loading,
        homeTo: isAdmin ? "/admin" : "/dashboard",
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
