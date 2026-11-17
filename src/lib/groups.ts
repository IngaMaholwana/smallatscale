import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const GROUP_SELECT = "*, product:products(*, price_tiers(*)), group_members(*)";

export const totalQty = (g: { group_members: { quantity: number }[] }) => g.group_members.reduce((s, m) => s + m.quantity, 0);

/** Refresh group queries whenever members or groups change (live progress). */
export function useLiveGroups() {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`groups-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => qc.invalidateQueries({ queryKey: ["groups"] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "buying_groups" }, () => qc.invalidateQueries({ queryKey: ["groups"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);
}
