"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus, X, Trash2 } from "lucide-react";

type CelPosredni = {
  id: number;
  tytul: string;
  opis: string | null;
  termin: string | null;
  kategoria: "dlugoterminowy" | "sredni";
  wykonany: boolean;
  rodzic_id: number | null;
};

type NowyCel = {
  tytul: string;
  opis: string;
  termin: string;
};

type MegaCelDane = {
  trudnosc_docelowa: string;
  styl_docelowy: string;
};

const PUSTY_NOWY_CEL: NowyCel = { tytul: "", opis: "", termin: "" };

export default function PiramidaCelow() {
  const [cele, setCele] = useState<CelPosredni[]>([]);
  const [megaCel, setMegaCel] = useState<MegaCelDane | null>(null);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");

  const [formularzDlugo, setFormularzDlugo] = useState(false);
  const [nowyDlugo, setNowyDlugo] = useState<NowyCel>(PUSTY_NOWY_CEL);

  const [formularzSredniDla, setFormularzSredniDla] = useState<number | null>(null);
  const [nowySredni, setNowySredni] = useState<NowyCel>(PUSTY_NOWY_CEL);

  useEffect(() => {
    pobierzCele();
    pobierzMegaCel();
  }, []);

  async function pobierzMegaCel() {
    const { data, error } = await supabase
      .from("cele")
      .select("trudnosc_docelowa, styl_docelowy")
      .maybeSingle();

    if (error) {
      console.error("Błąd pobierania Mega Celu:", error);
      return;
    }
    setMegaCel(data as MegaCelDane | null);
  }

  async function pobierzCele() {
    const { data, error } = await supabase
      .from("cele_posrednie")
      .select("*")
      .order("termin", { ascending: true });

    if (error) {
      console.error("Błąd pobierania celów:", error);
      setBlad("Nie udało się pobrać celów. Odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setCele(data as CelPosredni[]);
    setLadowanie(false);
  }

  async function dodajCelDlugoterminowy() {
    if (nowyDlugo.tytul.trim() === "") {
      setBlad("Podaj tytuł celu.");
      return;
    }
    setBlad("");

    const { error } = await supabase.from("cele_posrednie").insert({
      tytul: nowyDlugo.tytul,
      opis: nowyDlugo.opis.trim() === "" ? null : nowyDlugo.opis,
      termin: nowyDlugo.termin === "" ? null : nowyDlugo.termin,
      kategoria: "dlugoterminowy",
      rodzic_id: null,
    });

    if (error) {
      console.error("Błąd dodawania celu:", error);
      setBlad("Nie udało się dodać celu. Spróbuj ponownie.");
      return;
    }

    setNowyDlugo(PUSTY_NOWY_CEL);
    setFormularzDlugo(false);
    pobierzCele();
  }

  async function dodajCelSredni(rodzicId: number) {
    if (nowySredni.tytul.trim() === "") {
      setBlad("Podaj tytuł celu.");
      return;
    }
    setBlad("");

    const { error } = await supabase.from("cele_posrednie").insert({
      tytul: nowySredni.tytul,
      opis: nowySredni.opis.trim() === "" ? null : nowySredni.opis,
      termin: nowySredni.termin === "" ? null : nowySredni.termin,
      kategoria: "sredni",
      rodzic_id: rodzicId,
    });

    if (error) {
      console.error("Błąd dodawania celu:", error);
      setBlad("Nie udało się dodać celu. Spróbuj ponownie.");
      return;
    }

    setNowySredni(PUSTY_NOWY_CEL);
    setFormularzSredniDla(null);
    pobierzCele();
  }

  async function przelaczWykonanie(cel: CelPosredni) {
    const { error } = await supabase
      .from("cele_posrednie")
      .update({ wykonany: !cel.wykonany })
      .eq("id", cel.id);

    if (error) {
      console.error("Błąd aktualizacji celu:", error);
      setBlad("Nie udało się zaktualizować celu.");
      return;
    }
    setCele((poprzednie) =>
      poprzednie.map((c) => (c.id === cel.id ? { ...c, wykonany: !c.wykonany } : c))
    );
  }

  async function usunCel(id: number) {
    const { error } = await supabase.from("cele_posrednie").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania celu:", error);
      setBlad("Nie udało się usunąć celu.");
      return;
    }
    pobierzCele();
  }

  if (ladowanie) return <p className="text-gray-500">Ładowanie...</p>;

  const celeDlugoterminowe = cele.filter((c) => c.kategoria === "dlugoterminowy");

  return (
    <div>
      {megaCel && (
        <Card className="p-5 mb-5 bg-gray-900 text-white">
          <div className="text-gray-300 text-sm">Mega Cel · {megaCel.styl_docelowy}</div>
          <div className="text-2xl font-bold mt-1">{megaCel.trudnosc_docelowa}</div>
          <div className="text-gray-400 text-xs mt-1">
            Każdy cel poniżej to krok w drodze do tego celu.
          </div>
        </Card>
      )}

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold">Piramida celów</h2>
        <Button size="sm" variant="outline" onClick={() => setFormularzDlugo(!formularzDlugo)}>
          {formularzDlugo ? "Anuluj" : "+ Cel długoterminowy"}
        </Button>
      </div>

      {formularzDlugo && (
        <Card className="p-4 mb-4">
          <div className="flex gap-2 flex-wrap items-center">
            <Input
              value={nowyDlugo.tytul}
              onChange={(e) => setNowyDlugo({ ...nowyDlugo, tytul: e.target.value })}
              placeholder="Tytuł (np. Rok 1: kurs wspinania)"
              className="w-[220px]"
            />
            <Input
              value={nowyDlugo.opis}
              onChange={(e) => setNowyDlugo({ ...nowyDlugo, opis: e.target.value })}
              placeholder="Opis (opcjonalnie)"
              className="w-[220px]"
            />
            <Input
              type="date"
              value={nowyDlugo.termin}
              onChange={(e) => setNowyDlugo({ ...nowyDlugo, termin: e.target.value })}
              className="w-[160px]"
            />
            <Button onClick={dodajCelDlugoterminowy}>Zapisz</Button>
          </div>
        </Card>
      )}

      {blad && <p className="text-red-600 text-sm mb-3">{blad}</p>}

      {celeDlugoterminowe.length === 0 ? (
        <p className="text-gray-500 py-5">
          Brak celów długoterminowych — dodaj pierwszy, żeby zacząć budować piramidę.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {celeDlugoterminowe.map((celDlugi) => {
            const celeSrednie = cele.filter((c) => c.rodzic_id === celDlugi.id);

            return (
              <Card key={celDlugi.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => przelaczWykonanie(celDlugi)}
                      className={`w-6 h-6 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        celDlugi.wykonany
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {celDlugi.wykonany && <Check size={14} />}
                    </button>
                    <div>
                      <div
                        className={`font-bold ${celDlugi.wykonany ? "line-through text-gray-400" : ""}`}
                      >
                        {celDlugi.tytul}
                      </div>
                      {celDlugi.opis && (
                        <div className="text-gray-500 text-sm mt-0.5">{celDlugi.opis}</div>
                      )}
                      {celDlugi.termin && (
                        <div className="text-gray-400 text-xs mt-0.5">Termin: {celDlugi.termin}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => usunCel(celDlugi.id)}
                    className="text-gray-300 hover:text-red-600 shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-4 pl-9 flex flex-col gap-2">
                  {celeSrednie.map((celSredni) => (
                    <div
                      key={celSredni.id}
                      className="flex items-start justify-between gap-3 bg-gray-50 rounded-md p-2.5"
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => przelaczWykonanie(celSredni)}
                          className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            celSredni.wykonany
                              ? "bg-gray-900 border-gray-900 text-white"
                              : "border-gray-300 hover:border-gray-400"
                          }`}
                        >
                          {celSredni.wykonany && <Check size={12} />}
                        </button>
                        <div>
                          <div
                            className={`text-sm font-medium ${
                              celSredni.wykonany ? "line-through text-gray-400" : ""
                            }`}
                          >
                            {celSredni.tytul}
                          </div>
                          {celSredni.opis && (
                            <div className="text-gray-500 text-xs mt-0.5">{celSredni.opis}</div>
                          )}
                          {celSredni.termin && (
                            <div className="text-gray-400 text-xs mt-0.5">
                              Termin: {celSredni.termin}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => usunCel(celSredni.id)}
                        className="text-gray-300 hover:text-red-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}

                  {formularzSredniDla === celDlugi.id ? (
                    <Card className="p-3">
                      <div className="flex gap-2 flex-wrap items-center">
                        <Input
                          value={nowySredni.tytul}
                          onChange={(e) =>
                            setNowySredni({ ...nowySredni, tytul: e.target.value })
                          }
                          placeholder="Tytuł (np. Styczeń: zapisanie się na sekcję)"
                          className="w-[220px]"
                        />
                        <Input
                          value={nowySredni.opis}
                          onChange={(e) =>
                            setNowySredni({ ...nowySredni, opis: e.target.value })
                          }
                          placeholder="Opis (opcjonalnie)"
                          className="w-[200px]"
                        />
                        <Input
                          type="date"
                          value={nowySredni.termin}
                          onChange={(e) =>
                            setNowySredni({ ...nowySredni, termin: e.target.value })
                          }
                          className="w-[150px]"
                        />
                        <Button size="sm" onClick={() => dodajCelSredni(celDlugi.id)}>
                          Zapisz
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFormularzSredniDla(null)}
                        >
                          Anuluj
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <button
                      onClick={() => {
                        setNowySredni(PUSTY_NOWY_CEL);
                        setFormularzSredniDla(celDlugi.id);
                      }}
                      className="text-gray-500 hover:text-gray-800 text-sm flex items-center gap-1 mt-1"
                    >
                      <Plus size={14} /> Dodaj cel średnioterminowy
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
