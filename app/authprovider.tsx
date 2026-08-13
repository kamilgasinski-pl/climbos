"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "./supabaseclient";
import type { Session } from "@supabase/supabase-js";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLadowanie(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (ladowanie) return;

    if (!session && pathname !== "/login") {
      router.push("/login");
    }

    if (session && pathname === "/login") {
      router.push("/");
    }
  }, [session, ladowanie, pathname, router]);

  if (ladowanie) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Ładowanie...</p>
      </div>
    );
  }

  if (!session && pathname !== "/login") {
    return null;
  }

  return <>{children}</>;
}