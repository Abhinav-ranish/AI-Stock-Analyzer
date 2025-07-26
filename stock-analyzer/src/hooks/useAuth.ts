// src/hooks/useAuth.ts
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useAuth() {
  const router = useRouter();

  async function register(nickname: string, email: string, password?: string) {
    const res = await fetch("https://api.aranish.uk/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    toast.success("Registered!");
    router.push("/login");
  }

  async function login(email: string, password?: string) {
    const res = await fetch("https://api.aranish.uk/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");

    localStorage.setItem("token", data.token); // optionally store
    toast.success("Logged in!");
    router.push("/portfolio");
  }

  return { register, login };
}
