import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Role = Database["public"]["Enums"]["app_role"];
export type GroupStatus = Database["public"]["Enums"]["group_status"];

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const user = u.user;
      if (!user) return null;
      const [{ data: roles }, { data: profile }, { data: verification }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("supplier_verifications").select("*").eq("supplier_id", user.id).maybeSingle(),
      ]);
      const r = (roles ?? []).map((x) => x.role);
      return { user, roles: r, profile, verification, is: (role: Role) => r.includes(role) };
    },
  });
}

export async function profilesById(ids: string[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return {} as Record<string, { business_name: string; full_name: string }>;
  const { data } = await supabase.from("profiles").select("id,business_name,full_name").in("id", uniq);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p])) as Record<string, { business_name: string; full_name: string }>;
}

export const statusLabel: Record<GroupStatus, string> = {
  open: "Open",
  moq_reached: "Minimum reached",
  supplier_confirmed: "Confirm & pay",
  supplier_rejected: "Declined",
  ready: "Ready to fulfil",
  fulfilled: "Ready for collection",
  completed: "Completed",
  cancelled: "Cancelled",
};
