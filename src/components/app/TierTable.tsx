import { rand, unitPriceFor, type Tier } from "@/lib/pricing";

export function TierTable({ basePrice, tiers, unit, qty }: { basePrice: number; tiers: Tier[]; unit: string; qty?: number }) {
  const rows = [{ min_qty: 1, unit_price: basePrice }, ...[...tiers].sort((a, b) => a.min_qty - b.min_qty)];
  const current = qty != null ? unitPriceFor(basePrice, tiers, qty) : null;
  return (
    <table className="w-full text-sm ledger-num">
      <tbody>
        {rows.map((t, i) => {
          const nxt = rows[i + 1];
          const upper = nxt ? `–${nxt.min_qty - 1}` : "+";
          const on = current != null && qty != null && qty >= t.min_qty && (!nxt || qty < nxt.min_qty);
          return (
            <tr key={t.min_qty} className={`border-b last:border-0 ${on ? "bg-accent/40 font-semibold" : ""}`}>
              <td className="py-1.5 pl-2">{t.min_qty}{upper} {unit}s</td>
              <td className="py-1.5 pr-2 text-right">{rand(t.unit_price)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
