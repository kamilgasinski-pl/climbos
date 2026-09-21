"use client";

import { useState, useEffect } from "react";
import { supabase } from "../supabaseclient";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SKALA_KURTYKI } from "../engine/gradeEngine";
import { Check, Plus, X, Pencil } from "lucide-react";

type Filar = "fizyczne" | "techniczne" | "mentalne" | "inne";
type TypCelu = "poziom" | "tekstowy";

type CelGlowny = {
  id: number;
  typ: TypCelu;
  trudnosc_docelowa: string | null;
  styl_docelowy: string | null;
  opis_tekstowy: string | null;
};

type CelPosredni = {
  id: number;
  tytul: string;
  kategoria: "dlugoterminowy" | "sredni" | "krotki";
  filar: Filar | null;
  wykonany: boolean;
  data_wykonania: string | null;
  termin: string | null;
};
type CelDzienny = {
  id: number;
  tytul: string;
  data: string;
  wykonany: boolean;
};

const NAZWY_FILAROW: Record<Filar, string> = {
  fizyczne: "Fizyczne",
  techniczne: "Techniczne",
  mentalne: "Mentalne",
  inne: "Inne",
};

const FILARY: Filar[] = ["fizyczne", "techniczne", "mentalne", "inne"];

function formatujDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function dzisiajISO(): string {
  return new Date().toISOString().split("T")[0];
}

function czyPoTerminie(termin: string | null): boolean {
  if (!termin) return false;
  return termin < dzisiajISO();
}

export default function PiramidaRozwoju() {
  const [celGlowny, setCelGlowny] = useState<CelGlowny | null>(null);
  const [celePosrednie, setCelePosrednie] = useState<CelPosredni[]>([]);
  const [ladowanie, setLadowanie] = useState(true);
  const [blad, setBlad] = useState("");

  const [edycjaCeluGlownego, setEdycjaCeluGlownego] = useState(false);
  const [typCelu, setTypCelu] = useState<TypCelu>("poziom");
  const [trudnoscDocelowa, setTrudnoscDocelowa] = useState("");
  const [stylDocelowy, setStylDocelowy] = useState("RP");
  const [opisTekstowy, setOpisTekstowy] = useState("");
  const [zapisywanieCeluGlownego, setZapisywanieCeluGlownego] = useState(false);

  const [formularzDlugo, setFormularzDlugo] = useState(false);
  const [nowyDlugoTytul, setNowyDlugoTytul] = useState("");
  const [nowyDlugoTermin, setNowyDlugoTermin] = useState("");

  const [otwartyFormularz, setOtwartyFormularz] = useState<string | null>(null);
  const [nowyTytul, setNowyTytul] = useState("");
  const [nowyTermin, setNowyTermin] = useState("");

  const [edytowanyId, setEdytowanyId] = useState<number | null>(null);
  const [edytowanyTytul, setEdytowanyTytul] = useState("");
  const [edytowanyTermin, setEdytowanyTermin] = useState("");
  
  const [celeDzienne, setCeleDzienne] = useState<CelDzienny[]>([]);
  const [nowaAktywnoscTytul, setNowaAktywnoscTytul] = useState("");
  const [nowaAktywnoscData, setNowaAktywnoscData] = useState(() => new Date().toISOString().split("T")[0]);
  const [zapisywanieAktywnosci, setZapisywanieAktywnosci] = useState(false);

  const [edytowanaAktywnoscId, setEdytowanaAktywnoscId] = useState<number | null>(null);
  const [edytowanaAktywnoscTytul, setEdytowanaAktywnoscTytul] = useState("");
  const [edytowanaAktywnoscData, setEdytowanaAktywnoscData] = useState("");

  useEffect(() => {
    pobierzWszystko();
  }, []);

   async function pobierzWszystko() {
    const dzisiaj = new Date().toISOString().split("T")[0];

    const [celRes, posrednieRes, dzienneRes] = await Promise.all([
      supabase.from("cele").select("*").maybeSingle(),
      supabase
        .from("cele_posrednie")
        .select("id, tytul, kategoria, filar, wykonany, data_wykonania, termin"),
      supabase
        .from("cele_dzienne")
        .select("id, tytul, data, wykonany")
        .gte("data", dzisiaj)
        .order("data", { ascending: true }),
    ]);

    if (celRes.data) {
      const c = celRes.data as CelGlowny;
      setCelGlowny(c);
      setTypCelu(c.typ ?? "poziom");
      setTrudnoscDocelowa(c.trudnosc_docelowa ?? "");
      setStylDocelowy(c.styl_docelowy ?? "RP");
      setOpisTekstowy(c.opis_tekstowy ?? "");
    }
    if (posrednieRes.data) setCelePosrednie(posrednieRes.data as CelPosredni[]);
    if (dzienneRes.data) setCeleDzienne(dzienneRes.data as CelDzienny[]);

    setLadowanie(false);
  }

  const celeDlugoterminowe = celePosrednie.filter((c) => c.kategoria === "dlugoterminowy");

  const celeZrealizowane = celePosrednie
    .filter((c) => c.wykonany)
    .sort((a, b) => {
      if (!a.data_wykonania) return 1;
      if (!b.data_wykonania) return -1;
      return new Date(b.data_wykonania).getTime() - new Date(a.data_wykonania).getTime();
    });

  function celeWKomorce(kategoria: "sredni" | "krotki", filar: Filar) {
    return celePosrednie.filter((c) => c.kategoria === kategoria && c.filar === filar);
  }

  async function zapiszCelGlowny() {
    if (typCelu === "poziom" && trudnoscDocelowa === "") {
      setBlad("Wybierz trudność docelową.");
      return;
    }
    if (typCelu === "tekstowy" && opisTekstowy.trim() === "") {
      setBlad("Opisz swój cel.");
      return;
    }
    setBlad("");
    setZapisywanieCeluGlownego(true);

    const { data, error } = await supabase
      .from("cele")
      .upsert(
        {
          id: celGlowny?.id,
          typ: typCelu,
          trudnosc_docelowa: typCelu === "poziom" ? trudnoscDocelowa : null,
          styl_docelowy: typCelu === "poziom" ? stylDocelowy : null,
          opis_tekstowy: typCelu === "tekstowy" ? opisTekstowy : null,
        },
        { onConflict: "id" }
      )
      .select()
      .single();

    setZapisywanieCeluGlownego(false);

    if (error) {
      console.error("Błąd zapisu celu głównego:", error);
      setBlad("Nie udało się zapisać celu.");
      return;
    }

    setCelGlowny(data as CelGlowny);
    setEdycjaCeluGlownego(false);
  }

  async function dodajDlugoterminowy() {
    if (nowyDlugoTytul.trim() === "") {
      setBlad("Podaj tytuł celu długoterminowego.");
      return;
    }
    setBlad("");

    const { error } = await supabase.from("cele_posrednie").insert({
      tytul: nowyDlugoTytul,
      kategoria: "dlugoterminowy",
      filar: null,
      termin: nowyDlugoTermin === "" ? null : nowyDlugoTermin,
    });

    if (error) {
      console.error("Błąd dodawania celu:", error);
      setBlad("Nie udało się dodać celu.");
      return;
    }

    setNowyDlugoTytul("");
    setNowyDlugoTermin("");
    setFormularzDlugo(false);
    pobierzWszystko();
  }

  function otworzFormularz(kategoria: "sredni" | "krotki", filar: Filar) {
    setOtwartyFormularz(`${kategoria}-${filar}`);
    setNowyTytul("");
    setNowyTermin("");
    setBlad("");
  }

  function zamknijFormularz() {
    setOtwartyFormularz(null);
    setNowyTytul("");
    setNowyTermin("");
  }

  async function dodajDoKomorki(kategoria: "sredni" | "krotki", filar: Filar) {
    if (nowyTytul.trim() === "") {
      setBlad("Podaj tytuł celu.");
      return;
    }
    setBlad("");

    const { error } = await supabase.from("cele_posrednie").insert({
      tytul: nowyTytul,
      kategoria,
      filar,
      termin: nowyTermin === "" ? null : nowyTermin,
    });

    if (error) {
      console.error("Błąd dodawania celu:", error);
      setBlad("Nie udało się dodać celu.");
      return;
    }

    zamknijFormularz();
    pobierzWszystko();
  }

  async function przelaczWykonanie(cel: CelPosredni) {
    const nowyStan = !cel.wykonany;
    const nowaData = nowyStan ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("cele_posrednie")
      .update({ wykonany: nowyStan, data_wykonania: nowaData })
      .eq("id", cel.id);

    if (error) {
      console.error("Błąd aktualizacji celu:", error);
      return;
    }
    setCelePosrednie((poprzednie) =>
      poprzednie.map((c) =>
        c.id === cel.id ? { ...c, wykonany: nowyStan, data_wykonania: nowaData } : c
      )
    );
  }

  async function usunCel(id: number) {
    const { error } = await supabase.from("cele_posrednie").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania celu:", error);
      return;
    }
    setCelePosrednie((poprzednie) => poprzednie.filter((c) => c.id !== id));
  }
    async function dodajAktywnoscDnia() {
    if (nowaAktywnoscTytul.trim() === "") {
      setBlad("Podaj nazwę aktywności.");
      return;
    }
    setBlad("");
    setZapisywanieAktywnosci(true);

    const { error } = await supabase.from("cele_dzienne").insert({
      tytul: nowaAktywnoscTytul,
      data: nowaAktywnoscData,
    });

    setZapisywanieAktywnosci(false);

    if (error) {
      console.error("Błąd dodawania aktywności:", error);
      setBlad("Nie udało się dodać aktywności.");
      return;
    }

    setNowaAktywnoscTytul("");
    setNowaAktywnoscData(new Date().toISOString().split("T")[0]);
    pobierzWszystko();
  }

  async function usunAktywnoscDnia(id: number) {
    const { error } = await supabase.from("cele_dzienne").delete().eq("id", id);
    if (error) {
      console.error("Błąd usuwania aktywności:", error);
      return;
    }
    setCeleDzienne((poprzednie) => poprzednie.filter((c) => c.id !== id));
  }
    function rozpocznijEdycjeAktywnosci(cel: CelDzienny) {
    setEdytowanaAktywnoscId(cel.id);
    setEdytowanaAktywnoscTytul(cel.tytul);
    setEdytowanaAktywnoscData(cel.data);
  }

  function anulujEdycjeAktywnosci() {
    setEdytowanaAktywnoscId(null);
    setEdytowanaAktywnoscTytul("");
    setEdytowanaAktywnoscData("");
  }

  async function zapiszEdycjeAktywnosci(id: number) {
    if (edytowanaAktywnoscTytul.trim() === "") {
      setBlad("Nazwa aktywności nie może być pusta.");
      return;
    }
    setBlad("");

    const { error } = await supabase
      .from("cele_dzienne")
      .update({ tytul: edytowanaAktywnoscTytul, data: edytowanaAktywnoscData })
      .eq("id", id);

    if (error) {
      console.error("Błąd edycji aktywności:", error);
      setBlad("Nie udało się zapisać zmiany.");
      return;
    }

    setCeleDzienne((poprzednie) =>
      poprzednie.map((c) =>
        c.id === id ? { ...c, tytul: edytowanaAktywnoscTytul, data: edytowanaAktywnoscData } : c
      )
    );
    anulujEdycjeAktywnosci();
  }

  function rozpocznijEdycje(cel: CelPosredni) {
    setEdytowanyId(cel.id);
    setEdytowanyTytul(cel.tytul);
    setEdytowanyTermin(cel.termin ?? "");
  }

  function anulujEdycje() {
    setEdytowanyId(null);
    setEdytowanyTytul("");
    setEdytowanyTermin("");
  }

  async function zapiszEdycje(id: number) {
    if (edytowanyTytul.trim() === "") {
      setBlad("Tytuł celu nie może być pusty.");
      return;
    }
    setBlad("");

    const noweTermin = edytowanyTermin === "" ? null : edytowanyTermin;

    const { error } = await supabase
      .from("cele_posrednie")
      .update({ tytul: edytowanyTytul, termin: noweTermin })
      .eq("id", id);

    if (error) {
      console.error("Błąd edycji celu:", error);
      setBlad("Nie udało się zapisać zmiany.");
      return;
    }

    setCelePosrednie((poprzednie) =>
      poprzednie.map((c) => (c.id === id ? { ...c, tytul: edytowanyTytul, termin: noweTermin } : c))
    );
    anulujEdycje();
  }

  if (ladowanie) return <p className="text-gray-500 py-5">Ładowanie...</p>;

  return (
    <div className="mb-10 flex flex-col gap-4">
      {/* Cel główny */}
      <Card className="p-4">
        {edycjaCeluGlownego ? (
          <div>
            <div className="text-gray-500 text-sm mb-2">Cel główny (kilka lat)</div>

            <div className="flex gap-2 mb-3">
              <Button
                size="sm"
                variant={typCelu === "poziom" ? "default" : "outline"}
                onClick={() => setTypCelu("poziom")}
              >
                Poziom wspinaczkowy
              </Button>
              <Button
                size="sm"
                variant={typCelu === "tekstowy" ? "default" : "outline"}
                onClick={() => setTypCelu("tekstowy")}
              >
                Cel opisowy
              </Button>
            </div>

            {typCelu === "poziom" ? (
              <div className="flex gap-2 flex-wrap items-center">
                <Select value={stylDocelowy} onValueChange={(v) => setStylDocelowy(v ?? "RP")}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RP">RP (redpoint)</SelectItem>
                    <SelectItem value="OS">OS (on-sight)</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={trudnoscDocelowa} onValueChange={(v) => setTrudnoscDocelowa(v ?? "")}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Trudność docelowa" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKALA_KURTYKI.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <textarea
                value={opisTekstowy}
                onChange={(e) => setOpisTekstowy(e.target.value)}
                placeholder='Np. "Przejść drogę Hokej w Tatrach na własnej asekuracji"'
                rows={2}
                className="w-full p-2 border border-gray-300 rounded-md resize-none text-sm"
              />
            )}

            <div className="flex gap-2 mt-3">
              <Button size="sm" onClick={zapiszCelGlowny} disabled={zapisywanieCeluGlownego}>
                {zapisywanieCeluGlownego ? "Zapisywanie..." : "Zapisz"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEdycjaCeluGlownego(false)}>
                Anuluj
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between">
            <div>
              <div className="text-gray-500 text-sm">Cel główny (kilka lat)</div>
              <div className="text-xl font-bold mt-1">
                {!celGlowny
                  ? "—"
                  : celGlowny.typ === "tekstowy"
                  ? celGlowny.opis_tekstowy
                  : `${celGlowny.trudnosc_docelowa} ${celGlowny.styl_docelowy}`}
              </div>
              {!celGlowny && (
                <div className="text-gray-400 text-xs mt-1">Kliknij ołówek, żeby ustawić cel</div>
              )}
            </div>
            <button
              onClick={() => {
                setTypCelu(celGlowny?.typ ?? "poziom");
                setTrudnoscDocelowa(celGlowny?.trudnosc_docelowa ?? "");
                setStylDocelowy(celGlowny?.styl_docelowy ?? "RP");
                setOpisTekstowy(celGlowny?.opis_tekstowy ?? "");
                setEdycjaCeluGlownego(true);
              }}
              className="text-gray-400 hover:text-gray-700"
            >
              <Pencil size={16} />
            </button>
          </div>
        )}
      </Card>

      {/* Cele długoterminowe */}
      <Card className="p-4">
        <div className="text-gray-500 text-sm mb-3">Cele długoterminowe (np. rok, sezon wspinaczkowy)</div>
        <div className="flex flex-col gap-1.5">
          {celeDlugoterminowe.map((cel) =>
            edytowanyId === cel.id ? (
              <div key={cel.id} className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2.5 py-1.5 flex-wrap">
                <Input
                  value={edytowanyTytul}
                  onChange={(e) => setEdytowanyTytul(e.target.value)}
                  className="h-7 text-sm flex-1 min-w-[140px]"
                  autoFocus
                />
                <Input
                  type="date"
                  value={edytowanyTermin}
                  onChange={(e) => setEdytowanyTermin(e.target.value)}
                  className="h-7 text-sm w-[150px]"
                />
                <button onClick={() => zapiszEdycje(cel.id)} className="text-green-600 hover:text-green-800">
                  <Check size={16} />
                </button>
                <button onClick={anulujEdycje} className="text-gray-400 hover:text-red-600">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div key={cel.id} className="flex items-center gap-2 bg-gray-50 rounded-md px-2.5 py-1.5">
                <button
                  onClick={() => przelaczWykonanie(cel)}
                  className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                    cel.wykonany ? "bg-gray-900 border-gray-900 text-white" : "border-gray-400"
                  }`}
                >
                  {cel.wykonany && <Check size={10} />}
                </button>
                <span className={`text-sm flex-1 ${cel.wykonany ? "line-through text-gray-400" : ""}`}>
                  {cel.tytul}
                </span>
                {cel.termin && !cel.wykonany && (
                  <span className={`text-xs ${czyPoTerminie(cel.termin) ? "text-red-600" : "text-gray-400"}`}>
                    do {formatujDate(cel.termin)}
                  </span>
                )}
                <button onClick={() => rozpocznijEdycje(cel)} className="text-gray-400 hover:text-blue-600">
                  <Pencil size={13} />
                </button>
                <button onClick={() => usunCel(cel.id)} className="text-gray-400 hover:text-red-600">
                  <X size={13} />
                </button>
              </div>
            )
          )}

          {formularzDlugo ? (
            <div className="flex gap-1.5 mt-1 flex-wrap">
              <Input
                value={nowyDlugoTytul}
                onChange={(e) => setNowyDlugoTytul(e.target.value)}
                placeholder="Np. przejść na wyższy poziom"
                className="h-8 text-sm flex-1 min-w-[160px]"
                autoFocus
              />
              <Input
                type="date"
                value={nowyDlugoTermin}
                onChange={(e) => setNowyDlugoTermin(e.target.value)}
                className="h-8 text-sm w-[150px]"
              />
              <Button size="sm" className="h-8" onClick={dodajDlugoterminowy}>
                <Check size={14} />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => {
                  setFormularzDlugo(false);
                  setNowyDlugoTermin("");
                }}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setFormularzDlugo(true)}
              className="text-blue-600 hover:underline text-sm flex items-center gap-1 mt-1"
            >
              <Plus size={13} /> Dodaj cel długoterminowy
            </button>
          )}
        </div>
      </Card>

      {/* Cele średnioterminowe */}
      <Card className="p-4">
        <div className="text-gray-500 text-sm mb-3">Cele średnioterminowe (np. kwartał)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FILARY.map((filar) => (
            <KomorkaFilaru
              key={`sredni-${filar}`}
              filar={filar}
              cele={celeWKomorce("sredni", filar)}
              formularzOtwarty={otwartyFormularz === `sredni-${filar}`}
              nowyTytul={nowyTytul}
              setNowyTytul={setNowyTytul}
              nowyTermin={nowyTermin}
              setNowyTermin={setNowyTermin}
              onOtworz={() => otworzFormularz("sredni", filar)}
              onZamknij={zamknijFormularz}
              onDodaj={() => dodajDoKomorki("sredni", filar)}
              onPrzelacz={przelaczWykonanie}
              onUsun={usunCel}
              edytowanyId={edytowanyId}
              edytowanyTytul={edytowanyTytul}
              setEdytowanyTytul={setEdytowanyTytul}
              edytowanyTermin={edytowanyTermin}
              setEdytowanyTermin={setEdytowanyTermin}
              onRozpocznijEdycje={rozpocznijEdycje}
              onZapiszEdycje={zapiszEdycje}
              onAnulujEdycje={anulujEdycje}
            />
          ))}
        </div>
      </Card>

      {/* Cele krótkoterminowe */}
      <Card className="p-4">
        <div className="text-gray-500 text-sm mb-3">Cele krótkoterminowe (np. tydzień, miesiąc)</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FILARY.map((filar) => (
            <KomorkaFilaru
              key={`krotki-${filar}`}
              filar={filar}
              cele={celeWKomorce("krotki", filar)}
              formularzOtwarty={otwartyFormularz === `krotki-${filar}`}
              nowyTytul={nowyTytul}
              setNowyTytul={setNowyTytul}
              nowyTermin={nowyTermin}
              setNowyTermin={setNowyTermin}
              onOtworz={() => otworzFormularz("krotki", filar)}
              onZamknij={zamknijFormularz}
              onDodaj={() => dodajDoKomorki("krotki", filar)}
              onPrzelacz={przelaczWykonanie}
              onUsun={usunCel}
              edytowanyId={edytowanyId}
              edytowanyTytul={edytowanyTytul}
              setEdytowanyTytul={setEdytowanyTytul}
              edytowanyTermin={edytowanyTermin}
              setEdytowanyTermin={setEdytowanyTermin}
              onRozpocznijEdycje={rozpocznijEdycje}
              onZapiszEdycje={zapiszEdycje}
              onAnulujEdycje={anulujEdycje}
            />
          ))}
        </div>
      </Card>
      {/* Aktywność jednodniowa */}
      <Card className="p-4">
        <div className="text-gray-500 text-sm mb-1">Pojedyńcza Aktywność</div>
        <p className="text-gray-400 text-xs mb-3">
          aktywność poza cotygodniowym harmonogramem (np. rozciąganie, spacer, joga, trening siłowy, itp.)
        </p>

                {celeDzienne.filter((c) => !c.wykonany).length > 0 && (
          <div className="flex flex-col gap-1.5 mb-3">
            {celeDzienne
              .filter((c) => !c.wykonany)
              .map((cel) =>
                edytowanaAktywnoscId === cel.id ? (
                  <div
                    key={cel.id}
                    className="flex items-center gap-1.5 bg-gray-50 rounded-md px-2.5 py-1.5 flex-wrap"
                  >
                    <Input
                      value={edytowanaAktywnoscTytul}
                      onChange={(e) => setEdytowanaAktywnoscTytul(e.target.value)}
                      className="h-7 text-sm flex-1 min-w-[140px]"
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={edytowanaAktywnoscData}
                      onChange={(e) => setEdytowanaAktywnoscData(e.target.value)}
                      className="h-7 text-sm w-[150px]"
                    />
                    <button
                      onClick={() => zapiszEdycjeAktywnosci(cel.id)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={16} />
                    </button>
                    <button onClick={anulujEdycjeAktywnosci} className="text-gray-400 hover:text-red-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div key={cel.id} className="flex items-center gap-2 bg-gray-50 rounded-md px-2.5 py-1.5">
                    <span className="text-xs text-gray-400 w-[70px] shrink-0">
                      {new Date(cel.data).toLocaleDateString("pl-PL", { day: "numeric", month: "short" })}
                    </span>
                    <span className="text-sm flex-1">{cel.tytul}</span>
                    <button
                      onClick={() => rozpocznijEdycjeAktywnosci(cel)}
                      className="text-gray-400 hover:text-blue-600"
                    >
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => usunAktywnoscDnia(cel.id)} className="text-gray-400 hover:text-red-600">
                      <X size={13} />
                    </button>
                  </div>
                )
              )}
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center">
          <Input
            value={nowaAktywnoscTytul}
            onChange={(e) => setNowaAktywnoscTytul(e.target.value)}
            placeholder="Np. rozciąganie w domu"
            className="w-[220px]"
          />
          <Input
            type="date"
            value={nowaAktywnoscData}
            onChange={(e) => setNowaAktywnoscData(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={dodajAktywnoscDnia} disabled={zapisywanieAktywnosci}>
            {zapisywanieAktywnosci ? "Zapisywanie..." : "+ Dodaj"}
          </Button>
        </div>
      </Card>
      {/* Zrealizowane cele */}
      <Card className="p-4">
        <div className="text-gray-500 text-sm mb-3">Zrealizowane cele</div>
        {celeZrealizowane.length === 0 ? (
          <p className="text-gray-400 text-sm">Jeszcze żadnego celu nie odhaczono.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {celeZrealizowane.map((cel) => (
              <div key={cel.id} className="flex items-center gap-2 text-sm">
                <span>🏆</span>
                <span className="flex-1">{cel.tytul}</span>
                <span className="text-gray-400 text-xs">
                  {cel.data_wykonania ? formatujDate(cel.data_wykonania) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {blad && <p className="text-red-600 text-sm text-center">{blad}</p>}
    </div>
  );
}

type KomorkaFilaruProps = {
  filar: Filar;
  cele: CelPosredni[];
  formularzOtwarty: boolean;
  nowyTytul: string;
  setNowyTytul: (v: string) => void;
  nowyTermin: string;
  setNowyTermin: (v: string) => void;
  onOtworz: () => void;
  onZamknij: () => void;
  onDodaj: () => void;
  onPrzelacz: (cel: CelPosredni) => void;
  onUsun: (id: number) => void;
  edytowanyId: number | null;
  edytowanyTytul: string;
  setEdytowanyTytul: (v: string) => void;
  edytowanyTermin: string;
  setEdytowanyTermin: (v: string) => void;
  onRozpocznijEdycje: (cel: CelPosredni) => void;
  onZapiszEdycje: (id: number) => void;
  onAnulujEdycje: () => void;
};

function KomorkaFilaru({
  filar,
  cele,
  formularzOtwarty,
  nowyTytul,
  setNowyTytul,
  nowyTermin,
  setNowyTermin,
  onOtworz,
  onZamknij,
  onDodaj,
  onPrzelacz,
  onUsun,
  edytowanyId,
  edytowanyTytul,
  setEdytowanyTytul,
  edytowanyTermin,
  setEdytowanyTermin,
  onRozpocznijEdycje,
  onZapiszEdycje,
  onAnulujEdycje,
}: KomorkaFilaruProps) {
  return (
    <div className="p-3 border border-gray-200 rounded-lg flex flex-col gap-1.5">
      <div className="font-bold text-gray-700 text-center text-sm mb-1">{NAZWY_FILAROW[filar]}</div>

      {cele.map((cel) =>
        edytowanyId === cel.id ? (
          <div key={cel.id} className="flex flex-col gap-1 bg-gray-50 rounded-md px-2 py-1.5">
            <Input
              value={edytowanyTytul}
              onChange={(e) => setEdytowanyTytul(e.target.value)}
              className="h-6 text-xs"
              autoFocus
            />
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={edytowanyTermin}
                onChange={(e) => setEdytowanyTermin(e.target.value)}
                className="h-6 text-xs flex-1"
              />
              <button onClick={() => onZapiszEdycje(cel.id)} className="text-green-600 hover:text-green-800">
                <Check size={13} />
              </button>
              <button onClick={onAnulujEdycje} className="text-gray-400 hover:text-red-600">
                <X size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div key={cel.id} className="flex flex-col gap-0.5 bg-gray-50 rounded-md px-2 py-1.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPrzelacz(cel)}
                className={`w-4 h-4 shrink-0 rounded border flex items-center justify-center ${
                  cel.wykonany ? "bg-gray-900 border-gray-900 text-white" : "border-gray-400"
                }`}
              >
                {cel.wykonany && <Check size={10} />}
              </button>
              <span className={`text-xs flex-1 ${cel.wykonany ? "line-through text-gray-400" : ""}`}>
                {cel.tytul}
              </span>
              <button onClick={() => onRozpocznijEdycje(cel)} className="text-gray-400 hover:text-blue-600">
                <Pencil size={12} />
              </button>
              <button onClick={() => onUsun(cel.id)} className="text-gray-400 hover:text-red-600">
                <X size={12} />
              </button>
            </div>
            {cel.termin && !cel.wykonany && (
              <span className={`text-[10px] pl-6 ${czyPoTerminie(cel.termin) ? "text-red-600" : "text-gray-400"}`}>
                do {formatujDate(cel.termin)}
              </span>
            )}
          </div>
        )
      )}

      {formularzOtwarty ? (
        <div className="flex flex-col gap-1 mt-1">
          <Input
            value={nowyTytul}
            onChange={(e) => setNowyTytul(e.target.value)}
            placeholder="Nazwa celu"
            className="h-7 text-xs"
            autoFocus
          />
          <Input
            type="date"
            value={nowyTermin}
            onChange={(e) => setNowyTermin(e.target.value)}
            className="h-7 text-xs"
          />
          <div className="flex gap-1">
            <Button size="sm" className="h-7 flex-1 text-xs" onClick={onDodaj}>
              Dodaj
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onZamknij}>
              <X size={12} />
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={onOtworz}
          className="text-blue-600 hover:underline text-xs flex items-center justify-center gap-1 mt-1"
        >
          <Plus size={11} /> Dodaj
        </button>
      )}
    </div>
  );
}