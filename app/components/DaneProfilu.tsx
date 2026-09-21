"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Loader2 } from "lucide-react";

type Profil = {
  wiek: number | null;
  wzrost_cm: number | null;
};

export default function DaneProfilu() {
  const [profil, setProfil] = useState<Profil | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");

  const [edycja, setEdycja] = useState(false);
  const [wiekTekst, setWiekTekst] = useState("");
  const [wzrostTekst, setWzrostTekst] = useState("");
  const [blad, setBlad] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  useEffect(() => {
    pobierzProfil();
  }, []);

  async function pobierzProfil() {
    const { data, error } = await supabase
      .from("profil_uzytkownika")
      .select("wiek, wzrost_cm")
      .maybeSingle();

    if (error) {
      console.error("Błąd pobierania profilu:", error);
      setBladPobierania("Nie udało się pobrać danych profilu.");
      setLadowanie(false);
      return;
    }

    setProfil(data as Profil | null);
    setWiekTekst(data?.wiek?.toString() ?? "");
    setWzrostTekst(data?.wzrost_cm?.toString() ?? "");
    setLadowanie(false);
  }

  async function zapisz() {
    setBlad("");
    setZapisywanie(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setZapisywanie(false);
      setBlad("Nie udało się zidentyfikować użytkownika. Zaloguj się ponownie.");
      return;
    }

    const { error } = await supabase.from("profil_uzytkownika").upsert(
      {
        user_id: user.id,
        wiek: wiekTekst.trim() === "" ? null : Number(wiekTekst),
        wzrost_cm: wzrostTekst.trim() === "" ? null : Number(wzrostTekst),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu profilu:", error);
      setBlad("Nie udało się zapisać danych. Spróbuj ponownie.");
      return;
    }

    setProfil({
      wiek: wiekTekst.trim() === "" ? null : Number(wiekTekst),
      wzrost_cm: wzrostTekst.trim() === "" ? null : Number(wzrostTekst),
    });
    setEdycja(false);
  }

  if (ladowanie) {
    return (
      <Card className="p-5 mt-5 max-w-2xl flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="animate-spin" size={16} />
        Ładowanie...
      </Card>
    );
  }

  return (
    <Card className="p-5 mt-5 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold mb-1">Dane profilu</div>
          <p className="text-gray-500 text-sm">
            Wiek i wzrost — wpisujesz raz, wykorzystywane przy pomiarach i teście poziomu.
          </p>
        </div>
        {!edycja && (
          <button onClick={() => setEdycja(true)} className="text-gray-400 hover:text-gray-700">
            <Pencil size={16} />
          </button>
        )}
      </div>

      {bladPobierania && <p className="text-red-600 text-sm mt-2">{bladPobierania}</p>}

      {edycja ? (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-3">
          <div className="flex gap-2 flex-wrap">
            <Input
              type="number"
              value={wiekTekst}
              onChange={(e) => setWiekTekst(e.target.value)}
              placeholder="Wiek (lata)"
              className="w-[160px]"
              autoComplete="off"
            />
            <Input
              type="number"
              value={wzrostTekst}
              onChange={(e) => setWzrostTekst(e.target.value)}
              placeholder="Wzrost (cm)"
              className="w-[160px]"
              autoComplete="off"
            />
          </div>
          {blad && <p className="text-red-600 text-sm">{blad}</p>}
          <div className="flex gap-2">
            <Button onClick={zapisz} disabled={zapisywanie} size="sm">
              {zapisywanie ? "Zapisywanie..." : "Zapisz"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setWiekTekst(profil?.wiek?.toString() ?? "");
                setWzrostTekst(profil?.wzrost_cm?.toString() ?? "");
                setBlad("");
                setEdycja(false);
              }}
            >
              Anuluj
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-8 mt-3 text-sm">
          <div>
            <div className="text-gray-500">Wiek</div>
            <div className="font-bold">{profil?.wiek ?? "—"}</div>
          </div>
          <div>
            <div className="text-gray-500">Wzrost</div>
            <div className="font-bold">{profil?.wzrost_cm ? `${profil.wzrost_cm} cm` : "—"}</div>
          </div>
        </div>
      )}
    </Card>
  );
}