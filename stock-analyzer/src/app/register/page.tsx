"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleRegister = () => {
    if (!nickname || !email) {
      toast.error("Nickname and Email are required.");
      return;
    }

    toast.success("Registered successfully (stub)");
    router.push("/");
    // TODO: Hook into backend later
  };

  return (
    <div className="max-w-md mx-auto py-10 space-y-4">
      <h1 className="text-2xl font-bold">Register</h1>
      <Input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        type="password"
        placeholder="Password (optional)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button className="w-full" onClick={handleRegister}>
        Register
      </Button>
    </div>
  );
}
