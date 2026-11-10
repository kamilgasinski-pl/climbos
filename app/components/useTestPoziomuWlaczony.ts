"use client";

import { useEffect, useState } from "react";
import { pobierzUstawienia } from "../engine/ustawieniaEngine";

/** Zwraca true, gdy użytkownik włączył Test poziomu w Ustawieniach. */
export function useTestPoziomuWlaczony(): boolean {
  const [wlaczony, setWlaczony] = useState(false);

  useEffect(() => {
    let zywy = true;
    pobierzUstawienia().then((u) => {
      if (zywy) setWlaczony(u.test_poziomu_wlaczony);
    });
    return () => {
      zywy = false;
    };
  }, []);

  return wlaczony;
}