"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function register(email: string, password: string) {
    const { error } = await getSupabase().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    router.push("/login");
  }

  async function login(email: string, password: string) {
    const { error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    router.push("/portfolio");
  }

  async function logout() {
    await getSupabase().auth.signOut();
    setUser(null);
    setSession(null);
    router.push("/");
  }

  return { user, session, loading, register, login, logout };
}
