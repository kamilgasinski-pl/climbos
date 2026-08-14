"use client";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../supabaseclient";
import { konwertujOcene, SKALA_KURTYKI, najtrudniejszaOcena } from "../../engine/gradeEngine";
import { NAZWY_KOMPETENCJI, FILARY, NAZWY_FILAROW, Kompetencja, Filar } from "../../engine/climbingKnowledgeEngine";
import Link from "next/link";
import { Loader2, Pencil, X, Check } from "lucide-react";

type Sesja = {
  id: number;
  data_treningu: string;
  miejsce: string;
  czas_trwania_min: number;
  notatka: string | null;
};

type Przejscie = {
  id: number;
  nazwa_drogi: string;
  trudnosc: string;
  styl: string;
  sesja_id: number;
};

type WierszDrogi = {
  klucz: string;
  nazwaDrogi: string;
  trudnosc: string;
  styl: string;
};

type CelSesji = {
  id: number;
  tytul: string;
  kompetencje: Kompetencja[];
  wykonano: boolean;
};

function nowyWiersz(): WierszDrogi {
  return {
    klucz: crypto.randomUUID(),
    nazwaDrogi: "",
    trudnosc: "",
    styl: "OS",
  };
}

export default function SzczegolySesji() {
  const params = useParams();
  const sesjaId = Number(params.id);

  const [sesja, setSesja] = useState<Sesja | null>(null);
  const [przejscia, setPrzejscia] = useState<Przejscie[]>([]);
  const [ladowanie, setLadowanie] = useState(true);

  const [wiersze, setWiersze] = useState<WierszDrogi[]>(() => [nowyWiersz()]);
  const [bladPobierania, setBladPobierania] = useState("");
  const [bladFormularza, setBladFormularza] = useState("");
  const [zapisywanieDrog, setZapisywanieDrog] = useState(false);
  const [edycjaNotatki, setEdycjaNotatki] = useState(false);
  const [notatkaTekst, setNotatkaTekst] = useState("");
  const [zapisywanieNotatki, setZapisywanieNotatki] = useState(false);

  const [celeSesji, setCeleSesji] = useState<CelSesji[]>([]);
  const [nowyCelTytul, setNowyCelTytul] = useState("");
  const [nowyCelKompetencje, setNowyCelKompetencje] = useState<Kompetencja[]>([]);
  const [pokazKompetencjeCelu, setPokazKompetencjeCelu] = useState(false);
  const [bladCelu, setBladCelu] = useState("");
  const [zapisywanieCelu, setZapisywanieCelu] = useState(false);

  useEffect(() => {
    async function pobierzWszystko() {
      await Promise.all([pobierzSesje(), pobierzPrzejscia(), pobierzCeleSesji()]);
      setLadowanie(false);
    }
    pobierzWszystko();
  }, []);

  async function pobierzSesje() {
    const { data, error } = await supabase
      .from("sesje")
      .select("*")
      .eq("id", sesjaId)
      .single();

    if (error) {
      console.error("Błąd pobierania sesji:", error);
      setBladPobierania("Nie udało się pobrać danych sesji.");
      return;
    }
    setSesja(data as Sesja);
    setNotatkaTekst((data as Sesja).notatka ?? "");
  }

  async function pobierzPrzejscia() {
    const { data, error } = await supabase
      .from("przejscia")
      .select("*")
      .eq("sesja_id", sesjaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania przejść:", error);
      setBladPobierania("Nie udało się pobrać listy dróg.");
      return;
    }
    setPrzejscia(data as Przejscie[]);
  }

  async function pobierzCeleSesji() {
    const { data, error } = await supabase
      .from("cele_sesji")
      .select("*")
      .eq("sesja_id", sesjaId)
      .order("id", { ascending: true });

    if (error) {
      console.error("Błąd pobierania celów sesji:", error);
      setBladPobierania("Nie udało się pobrać celów sesji.");
      return;
    }
    setCeleSesji(data as unknown as CelSesji[]);
  }

  async function zapiszNotatke() {
    setZapisywanieNotatki(true);

    const { error } = await supabase
      .from("sesje")
      .update({ notatka: notatkaTekst.trim() === "" ? null : notatkaTekst })
      .eq("id", sesjaId);

    setZapisywanieNotatki(false);

    if (error) {
      console.error("Błąd zapisu notatki:", error);
      setBladPobierania("Nie udało się zapisać notatki. Spróbuj ponownie.");
      return;
    }

    setSesja((poprzednia) =>
      poprzednia
        ? { ...poprzednia, notatka: notatkaTekst.trim() === "" ? null : notatkaTekst }
        : poprzednia
    );
    setEdycjaNotatki(false);
  }

  function dodajWiersz() {
    setWiersze((poprzednie) => [...poprzednie, nowyWiersz()]);
  }

  function usunWiersz(klucz: string) {
    setWiersze((poprzednie) => poprzednie.filter((w) => w.klucz !== klucz));
  }

  function aktualizujWiersz(klucz: string, zmiana: Partial<WierszDrogi>) {
    setWiersze((poprzednie) =>
      poprzednie.map((w) => (w.klucz === klucz ? { ...w, ...zmiana } : w))
    );
  }

  async function zapiszWszystkieDrogi() {
    const niepoprawny = wiersze.some(
      (w) => w.nazwaDrogi.trim() === "" || w.trudnosc === ""
    );

    if (wiersze.length === 0 || niepoprawny) {
      setBladFormularza("Uzupełnij nazwę i trudność dla każdej dodawanej drogi.");
      return;
    }
    setBladFormularza("");
    setZapisywanieDrog(true);

    const rekordy = wiersze.map((w) => ({
      nazwa_drogi: w.nazwaDrogi,
      trudnosc: w.trudnosc,
      styl: w.styl,
      sesja_id: sesjaId,
    }));

    const { error } = await supabase.from("przejscia").insert(rekordy);

    setZapisywanieDrog(false);

    if (error) {
      console.error("Błąd dodawania dróg:", error);
      setBladFormularza("Nie udało się zapisać dróg. Spróbuj ponownie.");
      return;
    }

    setWiersze([nowyWiersz()]);
    pobierzPrzejscia();
  }

  async function usunPrzejscie(id: number) {
    const { error } = await supabase.from("przejscia").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania:", error);
      setBladPobierania("Nie udało się usunąć drogi. Spróbuj ponownie.");
      return;
    }
    pobierzPrzejscia();
  }

  function przelaczKompetencjeCelu(klucz: Kompetencja) {
    setNowyCelKompetencje((poprzednie) =>
      poprzednie.includes(klucz)
        ? poprzednie.filter((k) => k !== klucz)
        : [...poprzednie, klucz]
    );
  }

  async function dodajCelSesji() {
    if (nowyCelTytul.trim() === "") {
      setBladCelu("Podaj nazwę celu.");
      return;
    }
    setBladCelu("");
    setZapisywanieCelu(true);

    const { error } = await supabase.from("cele_sesji").insert({
      sesja_id: sesjaId,
      tytul: nowyCelTytul,
      kompetencje: nowyCelKompetencje,
    });

    setZapisywanieCelu(false);

    if (error) {
      console.error("Błąd dodawania celu sesji:", error);
      setBladCelu("Nie udało się dodać celu. Spróbuj ponownie.");
      return;
    }

    setNowyCelTytul("");
    setNowyCelKompetencje([]);
    setPokazKompetencjeCelu(false);
    pobierzCeleSesji();
  }

  async function przelaczWykonanieCelu(cel: CelSesji) {
    const { error } = await supabase
      .from("cele_sesji")
      .update({ wykonano: !cel.wykonano })
      .eq("id", cel.id);

    if (error) {
      console.error("Błąd aktualizacji celu:", error);
      setBladPobierania("Nie udało się zaktualizować celu. Spróbuj ponownie.");
      return;
    }

    setCeleSesji((poprzednie) =>
      poprzednie.map((c) => (c.id === cel.id ? { ...c, wykonano: !c.wykonano } : c))
    );
  }

  async function usunCelSesji(id: number) {
    const { error } = await supabase.from("cele_sesji").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania celu:", error);
      setBladPobierania("Nie udało się usunąć celu. Spróbuj ponownie.");
      return;
    }
    setCeleSesji((poprzednie) => poprzednie.filter((c) => c.id !== id));
  }

  const liczbaDrog = przejscia.length;
  const najtrudniejszaWSesji = najtrudniejszaOcena(przejscia.map((p) => p.trudnosc));

  const rozkladStylow = przejscia.reduce<Record<string, number>>((akumulator, p) => {
    akumulator[p.styl] = (akumulator[p.styl] ?? 0) + 1;
    return akumulator;
  }, {});

  if (ladowanie || !sesja) {
    return (
      <main className="p-10 font-sans flex items-center gap-2 text-gray-500">
        <Loader2 className="animate-spin" size={20} />
        Ładowanie sesji...
      </main>
    );
  }

  return (
    <main className="p-10 font-sans">
      <Link href="/sesje" className="text-gray-500 hover:underline">
        ← Wróć do listy sesji
      </Link>

      <h1 className="text-3xl font-bold mt-4">
        {sesja.miejsce} — {sesja.data_treningu}
      </h1>
      <p className="text-gray-500">Czas trwania: {sesja.czas_trwania_min} min</p>
      {bladPobierania && <p className="text-red-600 mt-2">{bladPobierania}</p>}

      <Card className="p-4 mt-4">
        {edycjaNotatki ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={notatkaTekst}
              onChange={(e) => setNotatkaTekst(e.target.value)}
              placeholder="Notatka do sesji..."
              rows={3}
              className="p-2 border border-gray-300 rounded-md resize-none"
            />
            <div className="flex gap-2">
              <Button onClick={zapiszNotatke} disabled={zapisywanieNotatki} size="sm">
                {zapisywanieNotatki ? "Zapisywanie..." : "Zapisz notatkę"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNotatkaTekst(sesja.notatka ?? "");
                  setEdycjaNotatki(false);
                }}
              >
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className={sesja.notatka ? "text-gray-700" : "text-gray-400 italic"}>
              {sesja.notatka || "Brak notatki — kliknij, aby dodać."}
            </p>
            <button
              onClick={() => setEdycjaNotatki(true)}
              className="text-gray-400 hover:text-gray-700 shrink-0"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </Card>

      <h2 className="text-xl font-bold mt-8">Cele sesji</h2>
      <p className="text-gray-500 text-sm mt-1">
        Np. "3x lot" żeby popracować nad kontrolą emocji. Odhaczony cel dolicza punkty do
        profilu kompetencji na Home.
      </p>

      <Card className="p-4 mt-3">
        {celeSesji.length === 0 ? (
          <p className="text-gray-400 text-sm mb-3">Brak celów dla tej sesji.</p>
        ) : (
          <ul className="flex flex-col gap-2 mb-4">
            {celeSesji.map((cel) => (
              <li
                key={cel.id}
                className="flex items-center gap-3 rounded-md px-3 py-2 bg-gray-50"
              >
                <button
                  onClick={() => przelaczWykonanieCelu(cel)}
                  className={`w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-colors ${
                    cel.wykonano
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                  aria-label={cel.wykonano ? "Oznacz jako niewykonany" : "Oznacz jako wykonany"}
                >
                  {cel.wykonano && <Check size={12} />}
                </button>
                <span
                  className={`text-sm font-medium ${
                    cel.wykonano ? "line-through text-gray-400" : ""
                  }`}
                >
                  {cel.tytul}
                </span>
                {cel.kompetencje.length > 0 && (
                  <div className="flex gap-1 flex-wrap ml-1">
                    {cel.kompetencje.map((k) => (
                      <span
                        key={k}
                        className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                      >
                        {NAZWY_KOMPETENCJI[k]}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => usunCelSesji(cel.id)}
                  className="text-gray-400 hover:text-red-600 ml-auto shrink-0"
                >
                  <X size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={nowyCelTytul}
            onChange={(e) => setNowyCelTytul(e.target.value)}
            placeholder="Nazwa celu (np. 3x lot)"
            className="w-[220px]"
          />
          <Button onClick={dodajCelSesji} disabled={zapisywanieCelu}>
            {zapisywanieCelu ? "Zapisywanie..." : "+ Dodaj cel"}
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setPokazKompetencjeCelu(!pokazKompetencjeCelu)}
          className="text-sm text-blue-600 hover:underline mt-3"
        >
          {pokazKompetencjeCelu
            ? "− Ukryj kompetencje"
            : nowyCelKompetencje.length > 0
            ? `+ Kompetencje (${nowyCelKompetencje.length})`
            : "+ Dodaj kompetencje (opcjonalnie)"}
        </button>

        {pokazKompetencjeCelu && (
          <div className="mt-3">
            <div className="text-gray-500 text-xs mb-2">
              Które kompetencje rozwija ten cel? (opcjonalnie)
            </div>
            <div className="flex flex-col gap-2">
              {(Object.keys(FILARY) as Filar[]).map((filar) => (
                <div key={filar} className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-400 text-xs w-[70px] shrink-0">
                    {NAZWY_FILAROW[filar]}
                  </span>
                  {FILARY[filar].map((klucz) => (
                    <button
                      key={klucz}
                      type="button"
                      onClick={() => przelaczKompetencjeCelu(klucz)}
                      className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                        nowyCelKompetencje.includes(klucz)
                          ? "bg-gray-900 border-gray-900 text-white"
                          : "border-gray-300 text-gray-600 hover:border-gray-400"
                      }`}
                    >
                      {NAZWY_KOMPETENCJI[klucz]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {bladCelu && <p className="text-red-600 text-sm mt-2">{bladCelu}</p>}
      </Card>

      <h2 className="text-xl font-bold mt-8">Dodaj drogi do tej sesji</h2>
      <div className="flex flex-col gap-2 mt-3">
        {wiersze.map((w) => (
          <Card key={w.klucz} className="flex flex-row items-center gap-2 p-3 flex-wrap">
            <Input
              value={w.nazwaDrogi}
              onChange={(e) => aktualizujWiersz(w.klucz, { nazwaDrogi: e.target.value })}
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
            <Select
              value={w.styl}
              onValueChange={(value) => aktualizujWiersz(w.klucz, { styl: value ?? "OS" })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OS">OS (on-sight)</SelectItem>
                <SelectItem value="RP">RP (redpoint)</SelectItem>
                <SelectItem value="Wędka">Wędka (top rope)</SelectItem>
                <SelectItem value="Boulder">Boulder</SelectItem>
              </SelectContent>
            </Select>
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
            + Dodaj kolejną drogę
          </Button>
          <Button onClick={zapiszWszystkieDrogi} disabled={zapisywanieDrog}>
            {zapisywanieDrog ? "Zapisywanie..." : "Zapisz drogi"}
          </Button>
        </div>
      </div>
      {bladFormularza && <p className="text-red-600 text-sm mt-2">{bladFormularza}</p>}

      <h2 className="text-xl font-bold mt-8">Podsumowanie sesji</h2>
      <Card className="p-4 flex gap-8 flex-wrap">
        <div>
          <div className="text-gray-500 text-sm">Liczba dróg</div>
          <div className="text-xl font-bold">{liczbaDrog}</div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">Najtrudniejsza</div>
          <div className="text-xl font-bold">{najtrudniejszaWSesji ?? "—"}</div>
        </div>
        <div>
          <div className="text-gray-500 text-sm">Style</div>
          <div className="text-sm font-medium mt-1">
            {liczbaDrog === 0
              ? "—"
              : Object.entries(rozkladStylow)
                  .map(([styl, liczba]) => `${styl}: ${liczba}`)
                  .join(" · ")}
          </div>
        </div>
      </Card>

      <h2 className="text-xl font-bold mt-8">Drogi w tej sesji</h2>
      <ul className="list-none p-0">
        {przejscia.map((p) => (
          <li key={p.id}>
            <Card className="flex flex-row items-center gap-4 p-2.5">
              <strong>{p.nazwa_drogi}</strong>
              <span>
                {p.trudnosc} ({konwertujOcene(p.trudnosc, "kurtyki", "francuska")})
              </span>
              <span>{p.styl}</span>
              <Button variant="destructive" size="sm" onClick={() => usunPrzejscie(p.id)}>
                Usuń
              </Button>
            </Card>
          </li>
        ))}
      </ul>
    </main>
  );
}