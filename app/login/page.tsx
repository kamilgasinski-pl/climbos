"use client";

import { useState } from "react";
import { supabase } from "../supabaseclient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Metoda = "link" | "haslo";
type TrybHasla = "logowanie" | "rejestracja";

export default function Login() {
  const [metoda, setMetoda] = useState<Metoda>("link");
  const [trybHasla, setTrybHasla] = useState<TrybHasla>("logowanie");

  const [email, setEmail] = useState("");
  const [haslo, setHaslo] = useState("");
  const [wyslano, setWyslano] = useState(false);
  const [rejestracjaZakonczona, setRejestracjaZakonczona] = useState(false);
  const [blad, setBlad] = useState("");
  const [ladowanie, setLadowanie] = useState(false);

  function walidujEmail(): boolean {
    if (email.trim() === "") {
      setBlad("Podaj adres email.");
      return false;
    }
    if (!email.includes("@")) {
      setBlad("Podaj poprawny adres email.");
      return false;
    }
    return true;
  }

  async function wyslijLink() {
    if (!walidujEmail()) return;
    setBlad("");
    setLadowanie(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLadowanie(false);

    if (error) {
      console.error("Błąd logowania:", error);
      setBlad("Nie udało się wysłać linku. Spróbuj ponownie.");
      return;
    }

    setWyslano(true);
  }

  async function zalogujHaslem() {
    if (!walidujEmail()) return;
    if (haslo === "") {
      setBlad("Podaj hasło.");
      return;
    }
    setBlad("");
    setLadowanie(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password: haslo });

    setLadowanie(false);

    if (error) {
      console.error("Błąd logowania:", error);
      setBlad("Nieprawidłowy email lub hasło.");
      return;
    }
    // Udane logowanie — AuthProvider przekieruje automatycznie po zmianie sesji.
  }

  async function zarejestrujHaslem() {
    if (!walidujEmail()) return;
    if (haslo.length < 6) {
      setBlad("Hasło musi mieć co najmniej 6 znaków.");
      return;
    }
    setBlad("");
    setLadowanie(true);

    const { error } = await supabase.auth.signUp({
      email,
      password: haslo,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    setLadowanie(false);

    if (error) {
      console.error("Błąd rejestracji:", error);
      setBlad("Nie udało się utworzyć konta. Spróbuj ponownie.");
      return;
    }

    setRejestracjaZakonczona(true);
  }

  function przelaczMetode(nowaMetoda: Metoda) {
    setMetoda(nowaMetoda);
    setBlad("");
    setWyslano(false);
    setRejestracjaZakonczona(false);
  }

  return (
    <main className="p-10 font-sans flex justify-center items-center min-h-screen">
      <Card className="p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">Zaloguj się do ClimbOS</h1>

        <div className="flex gap-2 mb-5">
          <Button
            size="sm"
            variant={metoda === "link" ? "default" : "outline"}
            onClick={() => przelaczMetode("link")}
          >
            Magic link
          </Button>
          <Button
            size="sm"
            variant={metoda === "haslo" ? "default" : "outline"}
            onClick={() => przelaczMetode("haslo")}
          >
            Email i hasło
          </Button>
        </div>

        {metoda === "link" ? (
          wyslano ? (
            <p className="text-green-700 bg-green-50 p-3 rounded-md">
              Sprawdź swoją skrzynkę email — wysłaliśmy link do logowania.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-gray-500 text-sm">
                Podaj swój email, wyślemy Ci link do zalogowania.
              </p>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="twoj@email.com"
              />
              {blad && <p className="text-red-600 text-sm">{blad}</p>}
              <Button onClick={wyslijLink} disabled={ladowanie}>
                {ladowanie ? "Wysyłanie..." : "Wyślij link logowania"}
              </Button>
            </div>
          )
        ) : rejestracjaZakonczona ? (
          <p className="text-green-700 bg-green-50 p-3 rounded-md">
            Sprawdź swoją skrzynkę email, żeby potwierdzić konto.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-gray-500 text-sm">
              {trybHasla === "logowanie"
                ? "Zaloguj się emailem i hasłem."
                : "Załóż nowe konto emailem i hasłem."}
            </p>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="twoj@email.com"
            />
            <Input
              type="password"
              value={haslo}
              onChange={(e) => setHaslo(e.target.value)}
              placeholder="Hasło"
            />
            {blad && <p className="text-red-600 text-sm">{blad}</p>}
            <Button
              onClick={trybHasla === "logowanie" ? zalogujHaslem : zarejestrujHaslem}
              disabled={ladowanie}
            >
              {ladowanie
                ? "Proszę czekać..."
                : trybHasla === "logowanie"
                  ? "Zaloguj się"
                  : "Zarejestruj się"}
            </Button>
            <button
              onClick={() => {
                setTrybHasla(trybHasla === "logowanie" ? "rejestracja" : "logowanie");
                setBlad("");
              }}
              className="text-gray-500 text-sm hover:underline text-left"
            >
              {trybHasla === "logowanie"
                ? "Nie masz konta? Zarejestruj się"
                : "Masz już konto? Zaloguj się"}
            </button>
          </div>
        )}
      </Card>
    </main>
  );
}