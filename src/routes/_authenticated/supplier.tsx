import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { GroupCard, Stat } from "@/components/app/GroupCard";
import { TierTable } from "@/components/app/TierTable";
import { GROUP_SELECT, totalQty, useLiveGroups } from "@/lib/groups";
import { rand } from "@/lib/pricing";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/supplier")({
  head: () => ({ meta: [{ title: "Supplier dashboard — Stokvel.trade" }, { name: "description", content: "Manage products, tiers and group orders." }] }),
  component: SupplierDash,
});

function SupplierDash() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  useLiveGroups();
  const uid = me?.user.id;
  const { data: products = [] } = useQuery({
    queryKey: ["my-products", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("products").select("*, price_tiers(*)").eq("supplier_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "supplier", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("buying_groups").select(GROUP_SELECT).eq("supplier_id", uid!).order("created_at", { ascending: false })).data ?? [],
  });
  if (!me) return null;
  const status = me.verification?.status ?? "pending";
  const decide = groups.filter((g) => g.status === "moq_reached");
  const fulfil = groups.filter((g) => g.status === "ready");
  const live = groups.filter((g) => ["open", "supplier_confirmed", "fulfilled"].includes(g.status));
  const revenue = groups.filter((g) => ["ready", "fulfilled", "completed"].includes(g.status)).reduce((s, g) => s + Number(g.final_unit_price ?? 0) * totalQty(g), 0);

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("products").update({ active }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-products"] });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-4xl font-semibold">{me.profile?.business_name || "Supplier"}</h1><p className="text-muted-foreground">Your products and group orders.</p></div>
        <Button onClick={() => setAdding(true)}><Plus className="h-4 w-4" />Add product</Button>
      </div>
      {status !== "verified" && (
        <div className={`rounded-xl border p-4 text-sm ${status === "rejected" ? "border-destructive/40 bg-destructive/10" : "border-accent bg-accent/20"}`}>
          {status === "pending" ? "Your account is waiting for admin verification. You can add products now; vendors will see them once you're verified." : `Verification declined${me.verification?.note ? `: ${me.verification.note}` : ""}.`}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="To confirm" value={decide.length} hint="Groups at minimum" />
        <Stat label="To fulfil" value={fulfil.length} hint="Fully paid" />
        <Stat label="Live groups" value={live.length} />
        <Stat label="Paid order value" value={rand(revenue)} />
      </div>
      {(decide.length > 0 || fulfil.length > 0) && (
        <section><h2 className="mb-3 text-2xl font-semibold">Needs your action</h2>
          <div className="grid gap-4 md:grid-cols-2">{[...decide, ...fulfil].map((g) => <GroupCard key={g.id} g={g} extra={<p className="mt-3 text-sm font-semibold text-primary">{g.status === "ready" ? "Fulfil order →" : "Confirm or decline →"}</p>} />)}</div>
        </section>
      )}
      <section><h2 className="mb-3 text-2xl font-semibold">Products</h2>
        {products.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No products yet.</div>}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between">
                <div><div className="font-display text-lg font-semibold">{p.name}</div><div className="text-xs text-muted-foreground">MOQ {p.moq} · stock {p.stock_available} · {p.lead_time_days}d lead</div></div>
                <Switch checked={p.active} onCheckedChange={(v) => toggle(p.id, v)} aria-label="Listed" />
              </div>
              <div className="mt-3"><TierTable basePrice={Number(p.base_price)} tiers={p.price_tiers} unit={p.unit} /></div>
            </div>
          ))}
        </div>
      </section>
      {groups.length > 0 && <section><h2 className="mb-3 text-2xl font-semibold">All groups</h2><div className="grid gap-4 md:grid-cols-2">{groups.map((g) => <GroupCard key={g.id} g={g} />)}</div></section>}
      {adding && <AddProduct supplierId={me.user.id} onClose={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["my-products"] }); }} />}
    </div>
  );
}

function AddProduct({ supplierId, onClose }: { supplierId: string; onClose: () => void }) {
  const [tiers, setTiers] = useState([{ min_qty: "", unit_price: "" }]);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.from("products").insert({
      supplier_id: supplierId, name: String(f.get("name")), description: String(f.get("description") ?? ""), unit: String(f.get("unit")),
      base_price: Number(f.get("base_price")), moq: Number(f.get("moq")), stock_available: Number(f.get("stock") || 0),
      lead_time_days: Number(f.get("lead") || 3), collection_point: String(f.get("point") ?? ""),
    }).select("id").single();
    if (error) { setBusy(false); { toast.error(error.message); return; } }
    const rows = tiers.filter((t) => t.min_qty && t.unit_price).map((t) => ({ product_id: data.id, min_qty: Number(t.min_qty), unit_price: Number(t.unit_price) }));
    if (rows.length) {
      const { error: te } = await supabase.from("price_tiers").insert(rows);
      if (te) toast.error(te.message);
    }
    setBusy(false);
    toast.success("Product added");
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-auto">
        <DialogHeader><DialogTitle>Add product</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>Name</Label><Input name="name" required placeholder="Cooking oil 5L" /></div>
          <div className="space-y-1"><Label>Description</Label><Textarea name="description" /></div>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1"><Label>Unit</Label><Input name="unit" required defaultValue="carton" /></div>
            <div className="space-y-1"><Label>Base price (R)</Label><Input name="base_price" type="number" step="0.01" min="0.01" required /></div>
            <div className="space-y-1"><Label>Group minimum</Label><Input name="moq" type="number" min={1} required /></div>
            <div className="space-y-1"><Label>Stock</Label><Input name="stock" type="number" min={0} /></div>
            <div className="space-y-1"><Label>Lead time (days)</Label><Input name="lead" type="number" min={0} defaultValue={3} /></div>
          </div>
          <div className="space-y-1"><Label>Collection address</Label><Input name="point" placeholder="Warehouse address" /></div>
          <div className="space-y-2">
            <Label>Volume tiers</Label>
            {tiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input type="number" min={2} placeholder="From qty" value={t.min_qty} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, min_qty: e.target.value } : x))} />
                <Input type="number" step="0.01" placeholder="Unit price R" value={t.unit_price} onChange={(e) => setTiers(tiers.map((x, j) => j === i ? { ...x, unit_price: e.target.value } : x))} />
                <Button type="button" variant="ghost" size="icon" onClick={() => setTiers(tiers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => setTiers([...tiers, { min_qty: "", unit_price: "" }])}>Add tier</Button>
          </div>
          <Button className="w-full" disabled={busy}>Save product</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
