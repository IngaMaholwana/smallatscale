import { Link } from "@tanstack/react-router";
import { GroupProgress } from "./GroupProgress";
import { StatusBadge } from "./StatusBadge";
import { totalQty } from "@/lib/groups";
import type { GroupStatus } from "@/lib/session";

type G = {
  id: string; name: string; moq: number; status: GroupStatus; deadline: string;
  group_members: { quantity: number; vendor_id: string }[];
  product: { name: string; unit: string; base_price: number; price_tiers: { min_qty: number; unit_price: number }[] } | null;
};

export function GroupCard({ g, extra }: { g: G; extra?: React.ReactNode }) {
  return (
    <Link to="/groups/$id" params={{ id: g.id }} className="block rounded-xl border bg-card p-5 shadow-card transition hover:border-primary">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="font-display text-lg font-semibold">{g.name}</div>
          <div className="text-sm text-muted-foreground">{g.product?.name} · {g.group_members.length} members · closes {new Date(g.deadline).toLocaleDateString("en-ZA")}</div>
        </div>
        <StatusBadge status={g.status} />
      </div>
      {g.product && <GroupProgress total={totalQty(g)} moq={g.moq} basePrice={Number(g.product.base_price)} tiers={g.product.price_tiers} unit={g.product.unit} />}
      {extra}
    </Link>
  );
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold ledger-num">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
