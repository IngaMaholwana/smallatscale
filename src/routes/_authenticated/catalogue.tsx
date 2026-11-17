import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { rand } from "@/lib/pricing";
import { profilesById } from "@/lib/session";
import { TierTable } from "@/components/app/TierTable";

export const Route = createFileRoute("/_authenticated/catalogue")({
  head: () => ({ meta: [{ title: "Catalogue — Stokvel.trade" }, { name: "description", content: "Products from verified suppliers with tiered group pricing." }] }),
  component: Catalogue,
});

function Catalogue() {
  const [pick, setPick] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const { data: me } = await supabase.auth.getUser();
      const products = ((await supabase.from("products").select("*, price_tiers(*)").eq("active", true).order("name")).data ?? [])
        .filter((p) => p.supplier_id !== me.user?.id);
      return { products, suppliers: await profilesById(products.map((p) => p.supplier_id)) };
    },
  });
  const product = data?.products.find((p) => p.id === pick);
  return (
    <div className="space-y-6">
      <div><h1 className="text-4xl font-semibold">Catalogue</h1><p className="text-muted-foreground">Products from verified suppliers. Start a group to unlock the tier prices.</p></div>
      {data?.products.length === 0 && <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No products yet. Verified suppliers' products will appear here.</div>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.products.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border bg-card p-5 shadow-card">
            <div className="font-display text-lg font-semibold">{p.name}</div>
            <div className="text-sm text-muted-foreground">{data.suppliers[p.supplier_id]?.business_name} · {p.lead_time_days}d lead time</div>
            {p.description && <p className="mt-2 text-sm">{p.description}</p>}
            <div className="my-3 text-sm">From <b className="ledger-num">{rand(p.base_price)}</b>/{p.unit} · Min. group order <b>{p.moq}</b></div>
            <TierTable basePrice={Number(p.base_price)} tiers={p.price_tiers} unit={p.unit} />
            <Button className="mt-4" onClick={() => setPick(p.id)}>Start a group</Button>
          </div>
        ))}
      </div>
      {product && <StartGroup product={product} onClose={() => setPick(null)} />}
    </div>
  );
}

function StartGroup({ product, onClose }: { product: { id: string; name: string; unit: string; collection_point: string }; onClose: () => void }) {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"supplier" | "shared_point">("supplier");
  const [busy, setBusy] = useState(false);
  const inAWeek = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.rpc("create_group", {
      _product_id: product.id,
      _name: String(f.get("name")),
      _quantity: Number(f.get("qty")),
      _deadline: new Date(String(f.get("deadline")) + "T23:59:00").toISOString(),
      _collection_method: method,
      _collection_point: String(f.get("point") ?? ""),
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Group created");
    navigate({ to: "/groups/$id", params: { id: data } });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Start a group for {product.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1"><Label>Group name</Label><Input name="name" required defaultValue={`${product.name} group`} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Your quantity ({product.unit}s)</Label><Input name="qty" type="number" min={1} required /></div>
            <div className="space-y-1"><Label>Closes on</Label><Input name="deadline" type="date" required defaultValue={inAWeek} /></div>
          </div>
          <div className="space-y-1">
            <Label>Collection</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="supplier">From supplier{product.collection_point ? ` (${product.collection_point})` : ""}</SelectItem>
                <SelectItem value="shared_point">One shared collection point</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {method === "shared_point" && <div className="space-y-1"><Label>Collection point address</Label><Input name="point" required /></div>}
          <Button className="w-full" disabled={busy}>Create group</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
