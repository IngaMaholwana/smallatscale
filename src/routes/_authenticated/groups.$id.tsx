import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GroupProgress } from "@/components/app/GroupProgress";
import { StatusBadge } from "@/components/app/StatusBadge";
import { TierTable } from "@/components/app/TierTable";
import { GROUP_SELECT, totalQty, useLiveGroups } from "@/lib/groups";
import { rand } from "@/lib/pricing";
import { profilesById, useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/groups/$id")({
  head: () => ({ meta: [{ title: "Buying group — Stokvel.trade" }, { name: "description", content: "Live progress, members, payments and order history." }] }),
  component: GroupPage,
});

const eventText: Record<string, string> = {
  group_created: "started the group", member_joined: "joined", quantity_changed: "changed quantity", member_left: "left the group",
  moq_reached: "Minimum order reached", moq_lost: "Dropped below minimum", supplier_confirmed: "Supplier confirmed",
  supplier_rejected: "Supplier declined", member_confirmed: "confirmed their order", payment_received: "paid (test payment)",
  all_members_paid: "All members paid", order_fulfilled: "Supplier marked ready for collection", collection_confirmed: "confirmed collection",
  order_completed: "Order completed", group_cancelled: "Group cancelled",
};

function GroupPage() {
  const { id } = Route.useParams();
  const { data: me } = useMe();
  const qc = useQueryClient();
  useLiveGroups();
  const { data } = useQuery({
    queryKey: ["groups", "detail", id],
    queryFn: async () => {
      const { data: g, error } = await supabase.from("buying_groups").select(GROUP_SELECT).eq("id", id).single();
      if (error) throw error;
      const { data: events } = await supabase.from("order_events").select("*").eq("group_id", id).order("created_at", { ascending: false });
      const people = await profilesById([g.supplier_id, ...g.group_members.map((m) => m.vendor_id), ...(events ?? []).map((e) => e.actor_id ?? "").filter(Boolean)]);
      return { g, events: events ?? [], people };
    },
  });
  const [busy, setBusy] = useState(false);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  if (!data || !me) return <p className="text-muted-foreground">Loading…</p>;
  const { g, events, people } = data;
  const p = g.product!;
  const total = totalQty(g);
  const mine = g.group_members.find((m) => m.vendor_id === me.user.id);
  const isSupplier = g.supplier_id === me.user.id;
  const editable = ["open", "moq_reached"].includes(g.status) && new Date(g.deadline) > new Date();

  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(ok);
    qc.invalidateQueries({ queryKey: ["groups"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-semibold">{g.name}</h1><StatusBadge status={g.status} /></div>
          <p className="text-muted-foreground">{p.name} from {people[g.supplier_id]?.business_name} · closes {new Date(g.deadline).toLocaleString("en-ZA")}</p>
        </div>
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <GroupProgress total={total} moq={g.moq} basePrice={Number(p.base_price)} tiers={p.price_tiers} unit={p.unit} />
          {g.final_unit_price != null && <p className="mt-3 text-sm">Locked price: <b className="ledger-num">{rand(g.final_unit_price)}</b>/{p.unit} · order value <b className="ledger-num">{rand(Number(g.final_unit_price) * total)}</b></p>}
          {g.supplier_note && <p className="mt-2 text-sm text-muted-foreground">Supplier note: {g.supplier_note}</p>}
          <p className="mt-2 text-sm text-muted-foreground">Collection: {g.collection_method === "supplier" ? "from supplier" : "shared point"}{g.collection_point ? ` — ${g.collection_point}` : ""}</p>
        </section>
        <section className="rounded-xl border bg-card shadow-card">
          <h2 className="border-b px-5 py-3 text-xl font-semibold">Members</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="px-5 py-2">Business</th><th>Qty</th><th>Due</th><th>Confirmed</th><th>Paid</th><th>Collected</th></tr></thead>
            <tbody className="ledger-num">
              {g.group_members.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-5 py-2">{people[m.vendor_id]?.business_name || "—"}{m.vendor_id === me.user.id && " (you)"}</td>
                  <td>{m.quantity}</td><td>{m.amount_due != null ? rand(m.amount_due) : "—"}</td>
                  <td><Tick on={m.confirmed} /></td><td><Tick on={m.payment_status === "paid"} /></td><td><Tick on={m.collected} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 text-xl font-semibold">Order history</h2>
          <ol className="space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-ZA", { dateStyle: "short", timeStyle: "short" })}</span>
                <span>{e.actor_id && !["moq_reached", "moq_lost", "all_members_paid", "order_completed"].includes(e.event_type) && <b>{people[e.actor_id]?.business_name} </b>}{eventText[e.event_type] ?? e.event_type}
                  {(e.details as { quantity?: number })?.quantity != null && ` (${(e.details as { quantity: number }).quantity})`}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h3 className="mb-3 text-lg font-semibold">Price tiers</h3>
          <TierTable basePrice={Number(p.base_price)} tiers={p.price_tiers} unit={p.unit} qty={total} />
        </div>
        <div className="space-y-3 rounded-xl border-2 border-primary/30 bg-card p-5 shadow-card">
          <h3 className="text-lg font-semibold">Your next step</h3>
          {me.is("vendor") && !isSupplier && editable && (
            <div className="space-y-2">
              <Input type="number" min={1} placeholder={mine ? `Your qty: ${mine.quantity}` : `How many ${p.unit}s?`} value={qty} onChange={(e) => setQty(e.target.value)} />
              <Button className="w-full" disabled={busy || !qty} onClick={() => run(() => supabase.rpc("join_group", { _group: g.id, _quantity: Number(qty) }), mine ? "Quantity updated" : "You joined the group").then(() => setQty(""))}>{mine ? "Update quantity" : "Join group"}</Button>
              {mine && <Button variant="ghost" className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("leave_group", { _group: g.id }), "You left the group")}>Leave group</Button>}
            </div>
          )}
          {mine && g.status === "supplier_confirmed" && (
            <div className="space-y-2">
              <p className="text-sm">Your share: <b className="ledger-num">{rand(mine.amount_due)}</b></p>
              {!mine.confirmed && <Button className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("member_confirm", { _group: g.id }), "Order confirmed")}>Confirm my order</Button>}
              {mine.confirmed && mine.payment_status !== "paid" && <Button className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("member_pay", { _group: g.id }), "Payment recorded")}>Pay {rand(mine.amount_due)} (test)</Button>}
              {mine.payment_status === "paid" && <p className="text-sm text-success">Paid. Waiting for other members.</p>}
              <p className="text-xs text-muted-foreground">Payments are simulated for now — no money moves.</p>
            </div>
          )}
          {mine && g.status === "fulfilled" && (mine.collected ? <p className="text-sm text-success">You've collected. Thanks!</p>
            : <Button className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("confirm_collection", { _group: g.id }), "Collection confirmed")}>I've collected my stock</Button>)}
          {isSupplier && g.status === "moq_reached" && (
            <div className="space-y-2">
              <p className="text-sm">Total {total} {p.unit}s. Stock available: {p.stock_available}.</p>
              <Textarea placeholder="Note to members (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("supplier_decide", { _group: g.id, _accept: true, ...(note ? { _note: note } : {}) }), "Order confirmed")}>Confirm order</Button>
              <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("supplier_decide", { _group: g.id, _accept: false, ...(note ? { _note: note } : {}) }), "Order declined")}>Decline</Button>
            </div>
          )}
          {isSupplier && g.status === "ready" && <Button className="w-full" disabled={busy} onClick={() => run(() => supabase.rpc("supplier_fulfil", { _group: g.id }), "Marked ready for collection")}>Mark ready for collection</Button>}
          <p className="text-xs text-muted-foreground">{hint(g.status, isSupplier, !!mine)}</p>
        </div>
      </aside>
    </div>
  );
}

function hint(s: string, supplier: boolean, member: boolean) {
  if (s === "open") return supplier ? "Waiting for the group to reach your minimum." : "Invite other vendors — the group needs to reach the minimum.";
  if (s === "moq_reached") return supplier ? "Confirm or decline this order." : "Minimum reached. Waiting for the supplier to confirm.";
  if (s === "supplier_confirmed") return supplier ? "Waiting for all members to confirm and pay." : member ? "Confirm and pay your share." : "";
  if (s === "ready") return supplier ? "Everyone has paid. Prepare the order." : "Everyone has paid. Supplier is preparing the order.";
  if (s === "fulfilled") return supplier ? "Waiting for members to collect." : "Stock is ready to collect.";
  if (s === "completed") return "This order is complete.";
  return "";
}

function Tick({ on }: { on: boolean }) {
  return on ? <Check className="h-4 w-4 text-success" /> : <X className="h-4 w-4 text-muted-foreground/40" />;
}
