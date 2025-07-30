// src/hooks/useAuth.ts
import { useRouter } from "next/navigation";


export function useAuth() {
  const router = useRouter();

  async function register(nickname: string, email: string, password?: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.aranish.uk";
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    router.push("/login");
  }

  async function login(email: string, password?: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.aranish.uk";
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("token", data.token); // optionally store
    router.push("/portfolio");
  }

  return { register, login };
}
