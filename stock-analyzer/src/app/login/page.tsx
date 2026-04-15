"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user, loading, login } = useAuth();

  if (loading) return null;
  if (user) {
    // Already logged in — redirect handled by useAuth or useEffect
    return (
      <div className="max-w-md mx-auto py-10">
        <p className="text-sm text-muted-foreground">You are already logged in.</p>
      </div>
    );
  }

  const handleLogin = async () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
      toast.success("Logged in successfully");
    } catch (err: any) {
      toast.error(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-bold">Login</h1>
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="w-full" onClick={handleLogin} disabled={submitting}>
        {submitting ? "Logging in..." : "Login"}
      </Button>
    </div>
  );
}
