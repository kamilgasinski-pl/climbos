"use client";

import { useState } from "react";
import { supabase } from "../supabaseclient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

export default function Profil() {
  const [haslo, setHaslo] = useState("");
  const [powtorzHaslo, setPowtorzHaslo] = useState("");
  const [blad, setBlad] = useState("");
  const [sukces, setSukces] = useState(false);
  const [zapisywanie, setZapisywanie] = useState(false);
  const [widoczneHaslo, setWidoczneHaslo] = useState(false);

  async function ustawHaslo() {
    if (haslo.length < 6) {
      setBlad("Hasło musi mieć co najmniej 6 znaków.");
      setSukces(false);
      return;
    }
    if (haslo !== powtorzHaslo) {
      setBlad("Hasła nie są identyczne.");
      setSukces(false);
      return;
    }
    setBlad("");
    setZapisywanie(true);

    const { error } = await supabase.auth.updateUser({ password: haslo });

    setZapisywanie(false);

    if (error) {
      console.error("Błąd ustawiania hasła:", error);
      setBlad("Nie udało się ustawić hasła. Spróbuj ponownie.");
      return;
    }

    setSukces(true);
    setHaslo("");
    setPowtorzHaslo("");
  }

  return (
    <main className="p-10 font-sans">
      <h1 className="text-3xl font-bold">Profil</h1>
      <p className="text-gray-500">Ustawienia konta i personalizacji</p>

      <Card className="p-5 mt-5 max-w-md">
        <div className="font-bold mb-1">Logowanie hasłem</div>
        <p className="text-gray-500 text-sm mb-4">
          Ustaw hasło do swojego konta, żeby móc logować się nim zamiast magic linka.
        </p>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Input
              type={widoczneHaslo ? "text" : "password"}
              value={haslo}
              onChange={(e) => setHaslo(e.target.value)}
              placeholder="Nowe hasło"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setWidoczneHaslo(!widoczneHaslo)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {widoczneHaslo ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Input
              type={widoczneHaslo ? "text" : "password"}
              value={powtorzHaslo}
              onChange={(e) => setPowtorzHaslo(e.target.value)}
              placeholder="Powtórz hasło"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setWidoczneHaslo(!widoczneHaslo)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
            >
              {widoczneHaslo ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {blad && <p className="text-red-600 text-sm">{blad}</p>}
          {sukces && (
            <p className="text-green-700 bg-green-50 p-2 rounded-md text-sm">
              Hasło zostało ustawione. Możesz teraz logować się emailem i hasłem.
            </p>
          )}
          <Button onClick={ustawHaslo} disabled={zapisywanie}>
            {zapisywanie ? "Zapisywanie..." : "Ustaw hasło"}
          </Button>
        </div>
      </Card>
    </main>
  );
}