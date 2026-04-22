"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAuth() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const loading = status === "loading";
  const user = session?.user ?? null;

  async function register(email: string, password: string) {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Registration failed");
    }

    router.push("/login");
  }

  async function login(email: string, password: string) {
    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      throw new Error("Invalid email or password");
    }

    router.push("/portfolio");
  }

  async function logout() {
    await signOut({ redirect: false });
    router.push("/");
  }

  return { user, session, loading, register, login, logout };
}
