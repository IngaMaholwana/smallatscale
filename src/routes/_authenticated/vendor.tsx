import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GroupCard, Stat } from "@/components/app/GroupCard";
import { GROUP_SELECT, totalQty, useLiveGroups } from "@/lib/groups";
import { rand, savingFor, unitPriceFor } from "@/lib/pricing";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/vendor")({
  head: () => ({ meta: [{ title: "Vendor dashboard — Stokvel.trade" }, { name: "description", content: "Your buying groups, payments and savings." }] }),
  component: VendorDash,
});

function VendorDash() {
  const { data: me } = useMe();
  useLiveGroups();
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "mine", me?.user.id],
    enabled: !!me,
    queryFn: async () => {
      const { data: mine } = await supabase.from("group_members").select("group_id").eq("vendor_id", me!.user.id);
      const ids = (mine ?? []).map((m) => m.group_id);
      if (!ids.length) return [];
      return (await supabase.from("buying_groups").select(GROUP_SELECT).in("id", ids).order("created_at", { ascending: false })).data ?? [];
    },
  });
  const uid = me?.user.id;
  const myRow = (g: (typeof groups)[number]) => g.group_members.find((m) => m.vendor_id === uid)!;
  const active = groups.filter((g) => !["completed", "cancelled", "supplier_rejected"].includes(g.status));
  const toAct = groups.filter((g) => (g.status === "supplier_confirmed" && myRow(g)?.payment_status !== "paid") || (g.status === "fulfilled" && !myRow(g)?.collected));
  const due = groups.filter((g) => g.status === "supplier_confirmed" && myRow(g)?.payment_status !== "paid").reduce((s, g) => s + Number(myRow(g).amount_due ?? 0), 0);
  const spent = groups.filter((g) => myRow(g)?.payment_status === "paid").reduce((s, g) => s + Number(myRow(g).amount_due ?? 0), 0);
  const saved = groups.reduce((s, g) => {
    if (!g.product) return s;
    const base = Number(g.product.base_price);
    const price = g.final_unit_price != null ? Number(g.final_unit_price) : unitPriceFor(base, g.product.price_tiers, totalQty(g));
    return s + savingFor(base, price, myRow(g)?.quantity ?? 0);
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold">Hello, {me?.profile?.business_name || "vendor"}</h1>
          <p className="text-muted-foreground">Your group orders at a glance.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/groups">Join a group</Link></Button>
          <Button asChild><Link to="/catalogue">Start a group</Link></Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active groups" value={active.length} />
        <Stat label="To pay now" value={rand(due)} hint="Confirmed by supplier" />
        <Stat label="Paid to date" value={rand(spent)} />
        <Stat label="Saved vs. alone" value={rand(saved)} hint="Compared with base price" />
      </div>
      {toAct.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-semibold">Needs your action</h2>
          <div className="grid gap-4 md:grid-cols-2">{toAct.map((g) => <GroupCard key={g.id} g={g} extra={<p className="mt-3 text-sm font-semibold text-primary">{g.status === "fulfilled" ? "Confirm collection →" : `Confirm & pay ${rand(myRow(g).amount_due)} →`}</p>} />)}</div>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-2xl font-semibold">My groups</h2>
        {groups.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">You're not in any group yet. Browse the catalogue to start one.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">{groups.map((g) => <GroupCard key={g.id} g={g} extra={<p className="mt-3 text-xs text-muted-foreground">Your share: {myRow(g)?.quantity} {g.product?.unit}s · {myRow(g)?.payment_status}</p>} />)}</div>
        )}
      </section>
    </div>
  );
}
