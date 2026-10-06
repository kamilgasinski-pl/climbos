import { WynikTrudnosciProsty } from "../engine/progressionEngine";

export default function PasekTrudnosciProsty({ wynik }: { wynik: WynikTrudnosciProsty }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-b-0">
      <strong className="text-lg">{wynik.trudnosc}</strong>
      <div className="flex gap-6 text-sm text-gray-600">
        <span>
          Wędka: <strong className="text-gray-900">{wynik.liczbaWedka}</strong>
        </span>
        <span>
          Z dołem: <strong className="text-gray-900">{wynik.liczbaZDolem}</strong>
        </span>
      </div>
    </div>
  );
}