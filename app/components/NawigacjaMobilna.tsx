"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { linki, LINKI_DOLNY_PASEK, czyAktywna } from "./pozycjeMenu";
import WylogujButton from "./WylogujButton";

/** Dolny pasek nawigacji, widoczny tylko na telefonie. */
export default function NawigacjaMobilna() {
  const sciezka = usePathname();
  const [wiecej, setWiecej] = useState(false);

  // Na ekranie logowania nie ma jeszcze dokąd nawigować.
  if (sciezka === "/login") return null;

  const glowne = linki.filter((l) => LINKI_DOLNY_PASEK.includes(l.href));
  const pozostale = linki.filter((l) => !LINKI_DOLNY_PASEK.includes(l.href));
  const wiecejAktywne = pozostale.some((l) => czyAktywna(sciezka, l.href));

  const klasaPozycji = (aktywna: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
      aktywna ? "text-blue-400 font-bold" : "text-gray-300"
    }`;

  return (
    <div className="md:hidden">
      {wiecej && (
        <>
          <button
            type="button"
            aria-label="Zamknij menu"
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setWiecej(false)}
          />
          <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-50 mx-2 mb-2 rounded-xl bg-gray-900 p-2 text-white shadow-lg flex flex-col">
            {pozostale.map((link) => {
              const Ikona = link.ikona;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setWiecej(false)}
                  className={`px-3 py-3 rounded-md flex items-center gap-3 ${
                    czyAktywna(sciezka, link.href) ? "bg-blue-600 font-bold" : "hover:bg-gray-800"
                  }`}
                >
                  <Ikona size={18} />
                  {link.label}
                </Link>
              );
            })}
            <div className="flex flex-col [&>button]:mt-0 [&>button]:py-3">
              <WylogujButton />
            </div>
          </div>
        </>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-6 bg-gray-900 border-t border-gray-700 pb-[env(safe-area-inset-bottom)]"
        aria-label="Nawigacja główna"
      >
        {glowne.map((link) => {
          const Ikona = link.ikona;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setWiecej(false)}
              className={klasaPozycji(czyAktywna(sciezka, link.href))}
            >
              <Ikona size={20} />
              {link.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setWiecej((o) => !o)}
          aria-expanded={wiecej}
          className={klasaPozycji(wiecej || wiecejAktywne)}
        >
          <Ellipsis size={20} />
          Więcej
        </button>
      </nav>
    </div>
  );
}
