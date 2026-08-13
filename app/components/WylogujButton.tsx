"use client";

import { useRouter } from "next/navigation";
import { supabase } from "../supabaseclient";
import { LogOut } from "lucide-react";

export default function WylogujButton() {
  const router = useRouter();

  async function wyloguj() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button
      onClick={wyloguj}
      className="px-3 py-2.5 rounded-md text-white hover:bg-gray-800 transition-colors flex items-center gap-3 mt-auto"
    >
      <LogOut size={18} />
      Wyloguj się
    </button>
  );
}