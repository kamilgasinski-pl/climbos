"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, X, Pencil } from "lucide-react";

type PomiarCiala = {
  id: number;
  data_pomiaru: string;
  waga_kg: number;
  bmi: number | null;
  tkanka_tluszczowa_procent: number | null;
  masa_miesniowa_kg: number | null;
  procent_miesni: number | null;
  woda_procent: number | null;
  bialko_procent: number | null;
  mineraly_kosci_procent: number | null;
  masa_miesni_szkieletowych_kg: number | null;
  tluszcz_trzewny: number | null;
    bmr_kcal: number | null;
  lbm_kg: number | null;
  impedancja_50khz: number | null;
  impedancja_250khz: number | null;
};

type PoleFormularza = {
  klucz: keyof Omit<PomiarCiala, "id" | "data_pomiaru">;
  etykieta: string;
  wymagane?: boolean;
};

const PODSTAWOWE: PoleFormularza[] = [
  { klucz: "waga_kg", etykieta: "Waga (kg)", wymagane: true },
  { klucz: "bmi", etykieta: "BMI" },
];

const SKLAD_CIALA: PoleFormularza[] = [
  { klucz: "tkanka_tluszczowa_procent", etykieta: "Tkanka tłuszczowa (%)" },
  { klucz: "masa_miesniowa_kg", etykieta: "Masa mięśniowa (kg)" },
  { klucz: "procent_miesni", etykieta: "Procent mięśni (%)" },
  { klucz: "masa_miesni_szkieletowych_kg", etykieta: "Masa mięśni szkieletowych (kg)" },
  { klucz: "lbm_kg", etykieta: "Waga bez tkanki tłuszczowej / LBM (kg)" },
];

const POZOSTALE: PoleFormularza[] = [
  { klucz: "woda_procent", etykieta: "Woda w organizmie (%)" },
  { klucz: "bialko_procent", etykieta: "Białko (%)" },
  { klucz: "mineraly_kosci_procent", etykieta: "Minerały kości (%)" },
  { klucz: "tluszcz_trzewny", etykieta: "Tłuszcz trzewny (poziom)" },
  { klucz: "bmr_kcal", etykieta: "BMR - podstawowa przemiana materii (kcal)" },
];

const IMPEDANCJA: PoleFormularza[] = [
  { klucz: "impedancja_50khz", etykieta: "Impedancja 50 kHz" },
  { klucz: "impedancja_250khz", etykieta: "Impedancja 250 kHz" },
];

const WSZYSTKIE_SEKCJE = [
  { tytul: "Podstawowe", pola: PODSTAWOWE },
  { tytul: "Skład ciała", pola: SKLAD_CIALA },
  { tytul: "Pozostałe", pola: POZOSTALE },
  { tytul: "Impedancja", pola: IMPEDANCJA },
];

function pustyFormularz(): Record<string, string> {
  const wynik: Record<string, string> = {};
  for (const sekcja of WSZYSTKIE_SEKCJE) {
    for (const pole of sekcja.pola) {
      wynik[pole.klucz] = "";
    }
  }
  return wynik;
}

export default function PomiaryCiala() {
  const [pomiary, setPomiary] = useState<PomiarCiala[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");

  const [pokazFormularz, setPokazFormularz] = useState(false);
  const [dataPomiaru, setDataPomiaru] = useState(() => new Date().toISOString().split("T")[0]);
  const [wartosci, setWartosci] = useState<Record<string, string>>(() => pustyFormularz());
  const [edytowanyPomiarId, setEdytowanyPomiarId] = useState<number | null>(null);
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  useEffect(() => {
    pobierzPomiary();

    const zapisanyDraft = localStorage.getItem("climbos_pomiar_draft");
    if (zapisanyDraft) {
      try {
        const dane = JSON.parse(zapisanyDraft);
        if (dane.wartosci) setWartosci(dane.wartosci);
        if (dane.dataPomiaru) setDataPomiaru(dane.dataPomiaru);
        if (dane.wartosci && Object.values(dane.wartosci as Record<string, string>).some((v) => v !== "")) {
          setPokazFormularz(true);
        }
      } catch (e) {
        console.error("Błąd wczytywania roboczego pomiaru:", e);
      }
    }
  }, []);

  async function pobierzPomiary() {
    const { data, error } = await supabase
      .from("pomiary_ciala")
      .select("*")
      .order("data_pomiaru", { ascending: false });

    if (error) {
      console.error("Błąd pobierania pomiarów:", error);
      setBladPobierania("Nie udało się pobrać pomiarów. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }
    setPomiary(data as PomiarCiala[]);
    setLadowanie(false);
  }

  function ustawWartosc(klucz: string, wartosc: string) {
    setWartosci((poprzednie) => ({ ...poprzednie, [klucz]: wartosc }));
  }

  function edytujPomiar(pomiar: PomiarCiala) {
    setEdytowanyPomiarId(pomiar.id);
    setDataPomiaru(pomiar.data_pomiaru);
    const nowe = pustyFormularz();
    for (const klucz of Object.keys(nowe)) {
      const wartosc = pomiar[klucz as keyof PomiarCiala];
      nowe[klucz] = wartosc == null ? "" : String(wartosc);
    }
    setWartosci(nowe);
    setBladFormularza("");
    setPokazFormularz(true);
  }

  async function zapiszPomiar() {
    if (wartosci.waga_kg.trim() === "" || Number(wartosci.waga_kg) <= 0) {
      setBladFormularza("Podaj wagę (kg).");
      return;
    }
    setBladFormularza("");
    setZapisywanie(true);

    const rekord: Record<string, unknown> = { data_pomiaru: dataPomiaru };
    for (const sekcja of WSZYSTKIE_SEKCJE) {
      for (const pole of sekcja.pola) {
        const tekst = wartosci[pole.klucz].trim();
        rekord[pole.klucz] = tekst === "" ? null : Number(tekst);
      }
    }

    const { error } = edytowanyPomiarId
      ? await supabase.from("pomiary_ciala").update(rekord).eq("id", edytowanyPomiarId)
      : await supabase.from("pomiary_ciala").insert(rekord);

    setZapisywanie(false);

    if (error) {
      console.error("Błąd zapisu pomiaru:", error);
      setBladFormularza("Nie udało się zapisać pomiaru. Spróbuj ponownie.");
      return;
    }

    setWartosci(pustyFormularz());
    setDataPomiaru(new Date().toISOString().split("T")[0]);
    setPokazFormularz(false);
    setEdytowanyPomiarId(null);
    pobierzPomiary();
  }

  async function usunPomiar(id: number) {
    const { error } = await supabase.from("pomiary_ciala").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania pomiaru:", error);
      setBladPobierania("Nie udało się usunąć pomiaru. Spróbuj ponownie.");
      return;
    }
    setPomiary((poprzednie) => poprzednie.filter((p) => p.id !== id));
  }

  const etykietyPoKluczu: Record<string, string> = {};
  for (const sekcja of WSZYSTKIE_SEKCJE) {
    for (const pole of sekcja.pola) {
      etykietyPoKluczu[pole.klucz] = pole.etykieta;
    }
  }

  return (
    <Card className="p-5 mt-5 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold mb-1">Pomiary z wagi</div>
          <p className="text-gray-500 text-sm">
            Dane ze zwykłej wagi analitycznej (waga, BMI, skład ciała) — historia w czasie.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (pokazFormularz) {
              setWartosci(pustyFormularz());
              setDataPomiaru(new Date().toISOString().split("T")[0]);
              setEdytowanyPomiarId(null);
            }
            setPokazFormularz(!pokazFormularz);
          }}
        >
          {pokazFormularz ? "Anuluj" : "+ Dodaj pomiar"}
        </Button>
      </div>

      {pokazFormularz && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-4">
          {edytowanyPomiarId && (
            <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Edycja pomiaru
            </div>
          )}

          <div>
            <div className="text-gray-500 text-xs mb-1">Data pomiaru</div>
            <Input
              type="date"
              value={dataPomiaru}
              onChange={(e) => setDataPomiaru(e.target.value)}
              className="w-[180px]"
            />
          </div>

          {WSZYSTKIE_SEKCJE.map((sekcja) => (
            <div key={sekcja.tytul}>
              <div className="text-gray-500 text-xs mb-2">{sekcja.tytul}</div>
              <div className="flex gap-2 flex-wrap">
                {sekcja.pola.map((pole) => (
                  <Input
                    key={pole.klucz}
                    type="number"
                    value={wartosci[pole.klucz]}
                    onChange={(e) => ustawWartosc(pole.klucz, e.target.value)}
                    placeholder={pole.etykieta}
                    className="w-[320px]"
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>
          ))}

          {bladFormularza && <p className="text-red-600 text-sm">{bladFormularza}</p>}

          <div>
            <Button onClick={zapiszPomiar} disabled={zapisywanie}>
              {zapisywanie
                ? "Zapisywanie..."
                : edytowanyPomiarId
                ? "Zapisz zmiany"
                : "Zapisz pomiar"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-gray-200">
        <div className="font-bold text-sm mb-2">Historia pomiarów</div>
        {ladowanie ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="animate-spin" size={16} />
            Ładowanie...
          </div>
        ) : bladPobierania ? (
          <p className="text-red-600 text-sm">{bladPobierania}</p>
        ) : pomiary.length === 0 ? (
          <p className="text-gray-400 text-sm">Brak wcześniejszych pomiarów.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {pomiary.map((p) => {
              const szczegoly = Object.keys(etykietyPoKluczu).filter(
                (klucz) => klucz !== "waga_kg" && p[klucz as keyof PomiarCiala] != null
              );
              return (
                <div key={p.id} className="p-3 rounded-md bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm">
                        {new Date(p.data_pomiaru).toLocaleDateString("pl-PL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-bold">{p.waga_kg} kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => edytujPomiar(p)}
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => usunPomiar(p.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  {szczegoly.length > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-600">
                      {szczegoly.map((klucz) => (
                        <span key={klucz}>
                          {etykietyPoKluczu[klucz]}: <strong>{p[klucz as keyof PomiarCiala]}</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}