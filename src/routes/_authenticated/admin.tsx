import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GroupCard, Stat } from "@/components/app/GroupCard";
import { GROUP_SELECT, totalQty } from "@/lib/groups";
import { rand } from "@/lib/pricing";
import { profilesById, useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Stokvel.trade" }, { name: "description", content: "Verify suppliers and monitor activity." }] }),
  component: Admin,
});

function Admin() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const { data: adminExists } = useQuery({ queryKey: ["admin-exists"], queryFn: async () => (await supabase.rpc("admin_exists")).data ?? true });
  const isAdmin = me?.is("admin");
  const { data } = useQuery({
    queryKey: ["admin-data"], enabled: !!isAdmin,
    queryFn: async () => {
      const [{ data: vers }, { data: groups }, { data: roles }] = await Promise.all([
        supabase.from("supplier_verifications").select("*").order("updated_at", { ascending: false }),
        supabase.from("buying_groups").select(GROUP_SELECT).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("role"),
      ]);
      const people = await profilesById((vers ?? []).map((v) => v.supplier_id));
      return { vers: vers ?? [], groups: groups ?? [], roles: roles ?? [], people };
    },
  });

  if (!me) return null;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md rounded-xl border bg-card p-6 text-center shadow-card">
        <h1 className="text-2xl font-semibold">Admin area</h1>
        {adminExists === false ? (<>
          <p className="my-3 text-sm text-muted-foreground">No platform admin has been set up yet. You can claim it now — this only works once.</p>
          <Button onClick={async () => { const { data: ok } = await supabase.rpc("claim_first_admin"); if (ok) { toast.success("You're now the admin"); qc.invalidateQueries(); } else toast.error("An admin already exists"); }}>Become platform admin</Button>
        </>) : <p className="mt-3 text-sm text-muted-foreground">You don't have access.</p>}
      </div>
    );
  }

  const set = async (id: string, status: "verified" | "rejected" | "pending") => {
    const note = status === "rejected" ? window.prompt("Reason (optional)") ?? undefined : undefined;
    const { error } = await supabase.rpc("admin_set_verification", { _supplier: id, _status: status, ...(note ? { _note: note } : {}) });
    if (error) { toast.error(error.message); return; }
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
  };
  const groups = data?.groups ?? [];
  const value = groups.filter((g) => g.final_unit_price != null && !["supplier_rejected", "cancelled"].includes(g.status)).reduce((s, g) => s + Number(g.final_unit_price) * totalQty(g), 0);
  const saved = groups.filter((g) => g.final_unit_price != null && g.product).reduce((s, g) => s + (Number(g.product!.base_price) - Number(g.final_unit_price)) * totalQty(g), 0);
  const count = (r: string) => (data?.roles ?? []).filter((x) => x.role === r).length;

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-semibold">Platform admin</h1>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Vendors" value={count("vendor")} />
        <Stat label="Suppliers" value={count("supplier")} />
        <Stat label="Groups" value={groups.length} />
        <Stat label="Confirmed order value" value={rand(value)} />
        <Stat label="Savings delivered" value={rand(saved)} />
      </div>
      <section className="rounded-xl border bg-card shadow-card">
        <h2 className="border-b px-5 py-3 text-xl font-semibold">Supplier verification</h2>
        {(data?.vers ?? []).length === 0 && <p className="p-5 text-sm text-muted-foreground">No suppliers yet.</p>}
        {(data?.vers ?? []).map((v) => (
          <div key={v.supplier_id} className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3">
            <div>
              <div className="font-medium">{data?.people[v.supplier_id]?.business_name || "—"}</div>
              <div className="text-xs text-muted-foreground">{data?.people[v.supplier_id]?.full_name}{v.note ? ` · ${v.note}` : ""}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={v.status === "verified" ? "default" : "secondary"}>{v.status}</Badge>
              {v.status !== "verified" && <Button size="sm" onClick={() => set(v.supplier_id, "verified")}>Verify</Button>}
              {v.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => set(v.supplier_id, "rejected")}>Reject</Button>}
            </div>
          </div>
        ))}
      </section>
      <section><h2 className="mb-3 text-2xl font-semibold">All groups</h2><div className="grid gap-4 md:grid-cols-2">{groups.map((g) => <GroupCard key={g.id} g={g} />)}</div></section>
    </div>
  );
}
