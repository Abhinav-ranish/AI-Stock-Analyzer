"use client";

import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  // Always check auth state on focus or mount
  useEffect(() => {
    const syncAuth = () => setToken(localStorage.getItem("token"));

    syncAuth(); // initial check

    window.addEventListener("focus", syncAuth); // catches login after redirect
    window.addEventListener("storage", syncAuth); // multi-tab

    return () => {
      window.removeEventListener("focus", syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null); // update UI
    router.push("/");
  };

  const isAuthed = !!token;

  return (
    <nav className="flex justify-between items-center mb-4 px-6 py-3 border-b bg-background sticky top-0 z-50">
      <a href="/">
        <h1 className="text-xl font-bold">Stock Analyzer</h1>
      </a>
      <div className="flex items-center gap-2">
        <a href="/portfolio" className="hidden sm:block">
          <Button variant="outline">Portfolio</Button>
        </a>

        {isAuthed ? (
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        ) : (
          <>
            <a href="/register">
              <Button variant="outline">Register</Button>
            </a>
            <a href="/login">
              <Button variant="outline">Login</Button>
            </a>
          </>
        )}
        <ModeToggle />
      </div>
    </nav>
  );
}
