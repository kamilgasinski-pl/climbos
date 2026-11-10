"use client";

import { useEffect, useState } from "react";
import { pobierzUstawienia } from "../engine/ustawieniaEngine";

/** Zwraca true, gdy użytkownik włączył zarządzanie kompetencjami w Ustawieniach. */
export function useKompetencjeWlaczone(): boolean {
  const [wlaczone, setWlaczone] = useState(false);

  useEffect(() => {
    let zywy = true;
    pobierzUstawienia().then((u) => {
      if (zywy) setWlaczone(u.zarzadzanie_kompetencjami);
    });
    return () => {
      zywy = false;
    };
  }, []);

  return wlaczone;
}