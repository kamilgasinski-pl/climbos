import { WynikTrudnosci } from "../engine/progressionEngine";

const ETYKIETY_STATUSU: Record<string, string> = {
  nieosiagniety: "Jeszcze nieosiągnięty",
  projekt: "Projekt",
  rozwijany: "Rozwijany",
  opanowany: "Opanowany",
};

const KOLORY_STATUSU: Record<string, string> = {
  nieosiagniety: "text-gray-400",
  projekt: "text-orange-500",
  rozwijany: "text-yellow-500",
  opanowany: "text-green-600",
};

export default function PasekTrudnosci({ wynik }: { wynik: WynikTrudnosci }) {
  const kolor = KOLORY_STATUSU[wynik.status];
  const etykieta = ETYKIETY_STATUSU[wynik.status];

  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <div>
        <strong className="text-lg">{wynik.trudnosc}</strong>
        <span className={`ml-2.5 font-bold ${kolor}`}>{etykieta}</span>
        <div className="text-gray-500 text-sm">
          {wynik.liczbaPrzejsc} {wynik.liczbaPrzejsc === 1 ? "przejście" : "przejść"}
        </div>
      </div>
      <div className="text-lg">
        {"★".repeat(wynik.gwiazdki)}
        {"☆".repeat(5 - wynik.gwiazdki)}
      </div>
    </div>
  );
}