import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function Notifications({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30)).data ?? [],
  });
  useEffect(() => {
    const ch = supabase
      .channel(`notif-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () =>
        qc.invalidateQueries({ queryKey: ["notifications"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);
  const unread = data.filter((n) => !n.read).length;

  const open = async (n: (typeof data)[number]) => {
    if (!n.read) await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    qc.invalidateQueries({ queryKey: ["notifications"] });
    const m = n.link?.match(/^\/groups\/(.+)$/);
    if (m?.[1]) navigate({ to: "/groups/$id", params: { id: m[1] } });
    else if (n.link === "/supplier") navigate({ to: "/supplier" });
  };
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && <button className="text-xs text-primary" onClick={markAll}>Mark all read</button>}
        </div>
        <div className="max-h-96 overflow-auto">
          {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nothing yet.</p>}
          {data.map((n) => (
            <button key={n.id} onClick={() => open(n)} className={`block w-full border-b px-3 py-2 text-left hover:bg-muted ${n.read ? "opacity-60" : ""}`}>
              <div className="text-sm font-medium">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.body}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
