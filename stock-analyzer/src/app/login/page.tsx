"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const router = useRouter();

  const handleLogin = () => {
    if (!email) {
      toast.error("Email is required.");
      return;
    }
    router.push("/");

    toast.success("Logged in (stub)");
    // TODO: Hook into backend later
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
        placeholder="Password (if set)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="w-full" onClick={handleLogin}>
        Login
      </Button>
    </div>
  );
}
