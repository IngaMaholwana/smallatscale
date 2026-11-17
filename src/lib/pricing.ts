export type Tier = { min_qty: number; unit_price: number };

const sorted = (tiers: Tier[]) => [...tiers].sort((a, b) => a.min_qty - b.min_qty);

/** Unit price for a total group quantity: the best tier whose minimum is met, else the base price. */
export function unitPriceFor(basePrice: number, tiers: Tier[], qty: number): number {
  let price = basePrice;
  for (const t of sorted(tiers)) if (qty >= t.min_qty) price = Number(t.unit_price);
  return Number(price);
}

/** The next cheaper tier above the current quantity and how many more units unlock it. */
export function nextTier(basePrice: number, tiers: Tier[], qty: number) {
  const current = unitPriceFor(basePrice, tiers, qty);
  const next = sorted(tiers).find((t) => t.min_qty > qty && Number(t.unit_price) < current);
  if (!next) return null;
  return { qtyNeeded: next.min_qty - qty, unitPrice: Number(next.unit_price), minQty: next.min_qty };
}

export function savingFor(basePrice: number, unitPrice: number, qty: number) {
  return Math.max(0, (basePrice - unitPrice) * qty);
}

export const rand = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(n ?? 0));
