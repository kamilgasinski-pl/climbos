"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import { konwertujOcene, SKALA_KURTYKI } from "../engine/gradeEngine";

const BUCKET = "projekty";

type Projekt = {
  id: number;
  nazwa: string;
  trudnosc: string;
  ilosc_wpinek: number | null;
  zdjecie_sciezka: string | null;
  zamkniety: boolean;
  data_zamkniecia: string | null;
};

type WierszProjektu = {
  klucz: string;
  nazwa: string;
  trudnosc: string;
  wpinki: string;
  plik: File | null;
};

function nowyWiersz(): WierszProjektu {
  return {
    klucz: crypto.randomUUID(),
    nazwa: "",
    trudnosc: "",
    wpinki: "",
    plik: null,
  };
}

/** Zdjęcia z telefonu bywają ogromne — zmniejszamy je przed wysłaniem. */
async function zmniejszZdjecie(plik: File, maksBok = 1280): Promise<Blob> {
  const bitmapa = await createImageBitmap(plik);
  const skala = Math.min(1, maksBok / Math.max(bitmapa.width, bitmapa.height));
  const szerokosc = Math.round(bitmapa.width * skala);
  const wysokosc = Math.round(bitmapa.height * skala);

  const canvas = document.createElement("canvas");
  canvas.width = szerokosc;
  canvas.height = wysokosc;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Brak obsługi canvas w przeglądarce");
  ctx.drawImage(bitmapa, 0, 0, szerokosc, wysokosc);
  bitmapa.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Nie udało się przetworzyć zdjęcia"))),
      "image/jpeg",
      0.82
    );
  });
}

async function wyslijZdjecie(plik: File): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Brak zalogowanego użytkownika");

  const blob = await zmniejszZdjecie(plik);
  const sciezka = `${data.user.id}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(sciezka, blob, { contentType: "image/jpeg" });
  if (error) throw error;

  return sciezka;
}

function formatujDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function przetworzWpinki(tekst: string): number | null | "blad" {
  if (tekst.trim() === "") return null;
  const liczba = Number(tekst);
  if (!Number.isInteger(liczba) || liczba < 0) return "blad";
  return liczba;
}

function PrzyciskZdjecia({
  plik,
  onWybierz,
}: {
  plik: File | null;
  onWybierz: (plik: File | null) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer text-sm border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-50 max-w-[200px]">
      <span className="truncate">{plik ? plik.name : "+ Zdjęcie"}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onWybierz(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export default function Projekty() {
  const [projekty, setProjekty] = useState<Projekt[]>([]);
  const [urle, setUrle] = useState<Record<string, string>>({});
  const [ladowanie, setLadowanie] = useState(true);
  const [bladPobierania, setBladPobierania] = useState("");

  const [wiersze, setWiersze] = useState<WierszProjektu[]>(() => [nowyWiersz()]);
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanie, setZapisywanie] = useState(false);

  const [edytowanyId, setEdytowanyId] = useState<number | null>(null);
  const [edNazwa, setEdNazwa] = useState("");
  const [edTrudnosc, setEdTrudnosc] = useState("");
  const [edWpinki, setEdWpinki] = useState("");
  const [edNowyPlik, setEdNowyPlik] = useState<File | null>(null);
  const [edUsunZdjecie, setEdUsunZdjecie] = useState(false);
  const [zapisywanieEdycji, setZapisywanieEdycji] = useState(false);

  useEffect(() => {
    pobierzProjekty();
  }, []);

  async function pobierzProjekty() {
    const { data, error } = await supabase
      .from("projekty")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Błąd pobierania projektów:", error);
      setBladPobierania("Nie udało się pobrać projektów. Sprawdź połączenie i odśwież stronę.");
      setLadowanie(false);
      return;
    }

    const lista = data as Projekt[];
    setProjekty(lista);

    const sciezki = lista
      .map((p) => p.zdjecie_sciezka)
      .filter((s): s is string => s !== null);

    if (sciezki.length > 0) {
      const { data: podpisane, error: bladUrli } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(sciezki, 3600);

      if (bladUrli) {
        console.error("Błąd pobierania linków do zdjęć:", bladUrli);
      }

      const mapa: Record<string, string> = {};
      podpisane?.forEach((p) => {
        if (p.path && p.signedUrl) mapa[p.path] = p.signedUrl;
      });
      setUrle(mapa);
    } else {
      setUrle({});
    }

    setLadowanie(false);
  }

  function dodajWiersz() {
    setWiersze((poprzednie) => [...poprzednie, nowyWiersz()]);
  }

  function usunWiersz(klucz: string) {
    setWiersze((poprzednie) => poprzednie.filter((w) => w.klucz !== klucz));
  }

  function aktualizujWiersz(klucz: string, zmiana: Partial<WierszProjektu>) {
    setWiersze((poprzednie) =>
      poprzednie.map((w) => (w.klucz === klucz ? { ...w, ...zmiana } : w))
    );
  }

  async function zapiszProjekty() {
    const niepoprawny = wiersze.some((w) => w.nazwa.trim() === "" || w.trudnosc === "");
    if (wiersze.length === 0 || niepoprawny) {
      setBladFormularza("Uzupełnij nazwę i trudność dla każdego projektu.");
      return;
    }
    if (wiersze.some((w) => przetworzWpinki(w.wpinki) === "blad")) {
      setBladFormularza("Liczba wpinek musi być liczbą całkowitą (0 lub więcej).");
      return;
    }

    setBladFormularza("");
    setZapisywanie(true);

    const wyslane: string[] = [];
    try {
      const rekordy = [];
      for (const w of wiersze) {
        let sciezka: string | null = null;
        if (w.plik) {
          sciezka = await wyslijZdjecie(w.plik);
          wyslane.push(sciezka);
        }
        rekordy.push({
          nazwa: w.nazwa.trim(),
          trudnosc: w.trudnosc,
          ilosc_wpinek: przetworzWpinki(w.wpinki) as number | null,
          zdjecie_sciezka: sciezka,
        });
      }

      const { error } = await supabase.from("projekty").insert(rekordy);
      if (error) throw error;
    } catch (e) {
      console.error("Błąd zapisu projektów:", e);
      if (wyslane.length > 0) await supabase.storage.from(BUCKET).remove(wyslane);
      setBladFormularza("Nie udało się zapisać projektów. Spróbuj ponownie.");
      setZapisywanie(false);
      return;
    }

    setZapisywanie(false);
    setWiersze([nowyWiersz()]);
    pobierzProjekty();
  }

  async function usunProjekt(p: Projekt) {
    const { error } = await supabase.from("projekty").delete().eq("id", p.id);
    if (error) {
      console.error("Błąd usuwania projektu:", error);
      setBladPobierania("Nie udało się usunąć projektu. Spróbuj ponownie.");
      return;
    }
    if (p.zdjecie_sciezka) {
      await supabase.storage.from(BUCKET).remove([p.zdjecie_sciezka]);
    }
    pobierzProjekty();
  }

  function rozpocznijEdycje(p: Projekt) {
    setEdytowanyId(p.id);
    setEdNazwa(p.nazwa);
    setEdTrudnosc(p.trudnosc);
    setEdWpinki(p.ilosc_wpinek?.toString() ?? "");
    setEdNowyPlik(null);
    setEdUsunZdjecie(false);
  }

  function anulujEdycje() {
    setEdytowanyId(null);
    setEdNazwa("");
    setEdTrudnosc("");
    setEdWpinki("");
    setEdNowyPlik(null);
    setEdUsunZdjecie(false);
  }

  async function zapiszEdycje(p: Projekt) {
    if (edNazwa.trim() === "" || edTrudnosc === "") {
      setBladPobierania("Podaj nazwę i trudność projektu.");
      return;
    }
    const wpinki = przetworzWpinki(edWpinki);
    if (wpinki === "blad") {
      setBladPobierania("Liczba wpinek musi być liczbą całkowitą (0 lub więcej).");
      return;
    }

    setBladPobierania("");
    setZapisywanieEdycji(true);

    let nowaSciezka: string | null = p.zdjecie_sciezka;
    let wyslanaNowa: string | null = null;

    try {
      if (edNowyPlik) {
        wyslanaNowa = await wyslijZdjecie(edNowyPlik);
        nowaSciezka = wyslanaNowa;
      } else if (edUsunZdjecie) {
        nowaSciezka = null;
      }

      const { error } = await supabase
        .from("projekty")
        .update({
          nazwa: edNazwa.trim(),
          trudnosc: edTrudnosc,
          ilosc_wpinek: wpinki,
          zdjecie_sciezka: nowaSciezka,
        })
        .eq("id", p.id);
      if (error) throw error;
    } catch (e) {
      console.error("Błąd edycji projektu:", e);
      if (wyslanaNowa) await supabase.storage.from(BUCKET).remove([wyslanaNowa]);
      setBladPobierania("Nie udało się zapisać zmiany. Spróbuj ponownie.");
      setZapisywanieEdycji(false);
      return;
    }

    if (p.zdjecie_sciezka && nowaSciezka !== p.zdjecie_sciezka) {
      await supabase.storage.from(BUCKET).remove([p.zdjecie_sciezka]);
    }

    setZapisywanieEdycji(false);
    anulujEdycje();
    pobierzProjekty();
  }

  async function ustawZamkniecie(p: Projekt, zamkniety: boolean) {
    const data = zamkniety ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("projekty")
      .update({ zamkniety, data_zamkniecia: data })
      .eq("id", p.id);

    if (error) {
      console.error("Błąd zmiany statusu projektu:", error);
      setBladPobierania("Nie udało się zmienić statusu projektu. Spróbuj ponownie.");
      return;
    }

    setBladPobierania("");
    setProjekty((poprzednie) =>
      poprzednie.map((x) =>
        x.id === p.id ? { ...x, zamkniety, data_zamkniecia: data } : x
      )
    );
  }

  const aktywne = projekty.filter((p) => !p.zamkniety);
  const ukonczone = projekty
    .filter((p) => p.zamkniety)
    .sort((a, b) => {
      if (!a.data_zamkniecia) return 1;
      if (!b.data_zamkniecia) return -1;
      return new Date(b.data_zamkniecia).getTime() - new Date(a.data_zamkniecia).getTime();
    });

  return (
    <div>
      <h2 className="text-xl font-bold">Dodaj projekty</h2>
      <p className="text-gray-500 text-sm mt-1">
        Drogi, nad którymi aktualnie pracujesz.
      </p>

      <div className="flex flex-col gap-2 mt-3">
        {wiersze.map((w) => (
          <Card key={w.klucz} className="flex flex-row items-center gap-2 p-3 flex-wrap">
            <Input
              value={w.nazwa}
              onChange={(e) => aktualizujWiersz(w.klucz, { nazwa: e.target.value })}
              placeholder="Nazwa drogi"
              className="w-[180px]"
            />
            <Select
              value={w.trudnosc}
              onValueChange={(value) => aktualizujWiersz(w.klucz, { trudnosc: value ?? "" })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Trudność" />
              </SelectTrigger>
              <SelectContent>
                {SKALA_KURTYKI.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              inputMode="numeric"
              value={w.wpinki}
              onChange={(e) => aktualizujWiersz(w.klucz, { wpinki: e.target.value })}
              placeholder="Wpinki"
              className="w-[100px]"
              autoComplete="off"
            />
            <PrzyciskZdjecia
              plik={w.plik}
              onWybierz={(plik) => aktualizujWiersz(w.klucz, { plik })}
            />
            {wiersze.length > 1 && (
              <button
                onClick={() => usunWiersz(w.klucz)}
                className="text-gray-400 hover:text-red-600 ml-auto"
              >
                <X size={18} />
              </button>
            )}
          </Card>
        ))}

        <div className="flex gap-2 mt-1">
          <Button variant="outline" onClick={dodajWiersz}>
            + Dodaj kolejny projekt
          </Button>
          <Button onClick={zapiszProjekty} disabled={zapisywanie}>
            {zapisywanie ? "Zapisywanie..." : "Zapisz projekty"}
          </Button>
        </div>
      </div>
      {bladFormularza && <p className="text-red-600 text-sm mt-2">{bladFormularza}</p>}

      <h2 className="text-xl font-bold mt-8">Twoje projekty</h2>
      {bladPobierania && <p className="text-red-600 text-sm mt-2">{bladPobierania}</p>}

      {ladowanie ? (
        <div className="flex items-center gap-2 text-gray-500 mt-3">
          <Loader2 className="animate-spin" size={20} />
          Ładowanie projektów...
        </div>
      ) : aktywne.length === 0 ? (
        <p className="text-gray-500 mt-3">
          Brak aktywnych projektów — dodaj drogę, nad którą pracujesz.
        </p>
      ) : (
        <ul className="list-none p-0 mt-3">
          {aktywne.map((p) =>
            edytowanyId === p.id ? (
              <li key={p.id}>
                <Card className="flex flex-row items-center gap-2 p-2.5 flex-wrap">
                  <Input
                    value={edNazwa}
                    onChange={(e) => setEdNazwa(e.target.value)}
                    placeholder="Nazwa drogi"
                    className="w-[180px]"
                    autoFocus
                  />
                  <Select value={edTrudnosc} onValueChange={(value) => setEdTrudnosc(value ?? "")}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Trudność" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKALA_KURTYKI.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={edWpinki}
                    onChange={(e) => setEdWpinki(e.target.value)}
                    placeholder="Wpinki"
                    className="w-[100px]"
                    autoComplete="off"
                  />
                  <PrzyciskZdjecia plik={edNowyPlik} onWybierz={setEdNowyPlik} />
                  {p.zdjecie_sciezka && !edNowyPlik && (
                    <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={edUsunZdjecie}
                        onChange={(e) => setEdUsunZdjecie(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      Usuń zdjęcie
                    </label>
                  )}
                  <Button size="sm" onClick={() => zapiszEdycje(p)} disabled={zapisywanieEdycji}>
                    {zapisywanieEdycji ? "Zapisywanie..." : "Zapisz"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={anulujEdycje}>
                    Anuluj
                  </Button>
                </Card>
              </li>
            ) : (
              <li key={p.id}>
                <Card className="flex flex-row items-center gap-4 p-2.5">
                  {p.zdjecie_sciezka && urle[p.zdjecie_sciezka] && (
                    <a
                      href={urle[p.zdjecie_sciezka]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urle[p.zdjecie_sciezka]}
                        alt={p.nazwa}
                        className="w-20 h-20 object-cover rounded-md"
                      />
                    </a>
                  )}
                  <div className="flex flex-col gap-0.5">
                    <strong>{p.nazwa}</strong>
                    <span className="text-sm text-gray-600">
                      {p.trudnosc} ({konwertujOcene(p.trudnosc, "kurtyki", "francuska")})
                    </span>
                    {p.ilosc_wpinek !== null && (
                      <span className="text-sm text-gray-500">Wpinki: {p.ilosc_wpinek}</span>
                    )}
                  </div>
                  <div className="flex gap-2 ml-auto">
                    <Button size="sm" onClick={() => ustawZamkniecie(p, true)}>
                      Zamknij projekt
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => rozpocznijEdycje(p)}>
                      Edytuj
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => usunProjekt(p)}>
                      Usuń
                    </Button>
                  </div>
                </Card>
              </li>
            )
          )}
        </ul>
      )}

      <h2 className="text-xl font-bold mt-8">Ukończone projekty</h2>
      <Card className="p-4 mt-3">
        {ukonczone.length === 0 ? (
          <p className="text-gray-400 text-sm">Jeszcze żaden projekt nie został zamknięty.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ukonczone.map((p) => (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span>🏆</span>
                {p.zdjecie_sciezka && urle[p.zdjecie_sciezka] && (
                  <a
                    href={urle[p.zdjecie_sciezka]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={urle[p.zdjecie_sciezka]}
                      alt={p.nazwa}
                      className="w-10 h-10 object-cover rounded-md"
                    />
                  </a>
                )}
                <span className="flex-1">
                  <strong>{p.nazwa}</strong>{" "}
                  <span className="text-gray-500">
                    {p.trudnosc} ({konwertujOcene(p.trudnosc, "kurtyki", "francuska")})
                  </span>
                </span>
                <span className="text-gray-400 text-xs">
                  {p.data_zamkniecia ? formatujDate(p.data_zamkniecia) : "—"}
                </span>
                <button
                  onClick={() => ustawZamkniecie(p, false)}
                  className="text-xs text-gray-400 hover:text-gray-700 hover:underline"
                >
                  Przywróć
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}