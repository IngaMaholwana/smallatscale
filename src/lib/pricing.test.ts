import { describe, expect, it } from "vitest";
import { nextTier, savingFor, unitPriceFor } from "./pricing";

// Brief example: base R250, 20+ R235, 40+ R220, 60+ R205
const tiers = [
  { min_qty: 40, unit_price: 220 },
  { min_qty: 20, unit_price: 235 },
  { min_qty: 60, unit_price: 205 },
];

describe("pricing engine", () => {
  it("uses base price below the first tier", () => expect(unitPriceFor(250, tiers, 19)).toBe(250));
  it("applies the 40+ tier at exactly 40", () => expect(unitPriceFor(250, tiers, 40)).toBe(220));
  it("applies the top tier at 60+", () => expect(unitPriceFor(250, tiers, 75)).toBe(205));
  it("says how many more units unlock the next tier", () =>
    expect(nextTier(250, tiers, 32)).toEqual({ qtyNeeded: 8, unitPrice: 220, minQty: 40 }));
  it("returns null when the best tier is reached", () => expect(nextTier(250, tiers, 60)).toBeNull());
  it("computes the R1,500 saving for 50 cartons", () => expect(savingFor(250, 220, 50)).toBe(1500));
});
