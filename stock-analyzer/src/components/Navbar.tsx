"use client";

import ModeToggle from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function Navbar() {
  const { user, loading, logout } = useAuth();

  return (
    <nav className="flex justify-between items-center px-8 py-4 border-b border-border/40 bg-background/60 backdrop-blur-xl sticky top-0 z-50 transition-all shadow-sm">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
          A
        </div>
        <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60 transition-colors">
          Stock Analyzer
        </h1>
      </Link>
      <div className="flex items-center gap-3">
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
