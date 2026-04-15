"use client";

import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center mb-4 px-6 py-3 border-b bg-background sticky top-0 z-50">
      <Link href="/">
        <h1 className="text-xl font-bold">Stock Analyzer</h1>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/portfolio" className="hidden sm:block">
          <Button variant="outline">Portfolio</Button>
        </Link>

        {!loading && (
          <>
            {user ? (
              <Button variant="destructive" onClick={logout}>
                Logout
              </Button>
            ) : (
              <>
                <Link href="/register">
                  <Button variant="outline">Register</Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline">Login</Button>
                </Link>
              </>
            )}
          </>
        )}
        <ModeToggle />
      </div>
    </nav>
  );
}
