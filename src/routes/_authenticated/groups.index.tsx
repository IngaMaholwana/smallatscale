import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GroupCard } from "@/components/app/GroupCard";
import { GROUP_SELECT, useLiveGroups } from "@/lib/groups";

export const Route = createFileRoute("/_authenticated/groups/")({
  head: () => ({ meta: [{ title: "Open buying groups — Stokvel.trade" }, { name: "description", content: "Join a buying group and unlock wholesale prices." }] }),
  component: OpenGroups,
});

function OpenGroups() {
  useLiveGroups();
  const { data: groups = [] } = useQuery({
    queryKey: ["groups", "open"],
    queryFn: async () => (await supabase.from("buying_groups").select(GROUP_SELECT).in("status", ["open", "moq_reached"]).gt("deadline", new Date().toISOString()).order("deadline")).data ?? [],
  });
  return (
    <div className="space-y-6">
      <div><h1 className="text-4xl font-semibold">Open groups</h1><p className="text-muted-foreground">Add your quantity to a group that's filling up.</p></div>
      {groups.length === 0 ? <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">No open groups right now. Start one from the catalogue.</div>
        : <div className="grid gap-4 md:grid-cols-2">{groups.map((g) => <GroupCard key={g.id} g={g} />)}</div>}
    </div>
  );
}
