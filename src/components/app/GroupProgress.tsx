import { Progress } from "@/components/ui/progress";
import { nextTier, rand, unitPriceFor, type Tier } from "@/lib/pricing";

export function GroupProgress({ total, moq, basePrice, tiers, unit }: { total: number; moq: number; basePrice: number; tiers: Tier[]; unit: string }) {
  const pct = Math.min(100, Math.round((total / moq) * 100));
  const price = unitPriceFor(basePrice, tiers, total);
  const next = nextTier(basePrice, tiers, total);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="ledger-num font-semibold">{total} of {moq} {unit}s</span>
        <span className="text-muted-foreground">{pct}% to minimum</span>
      </div>
      <Progress value={pct} className="h-2.5" />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
        <span>Current price <b className="text-foreground ledger-num">{rand(price)}</b>/{unit}</span>
        {next ? (
          <span><b className="text-primary">{next.qtyNeeded} more</b> unlocks {rand(next.unitPrice)}</span>
        ) : (
          <span className="text-success font-medium">Best price unlocked</span>
        )}
      </div>
    </div>
  );
}
