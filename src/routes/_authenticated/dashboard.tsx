import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dash });

function Dash() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) return <p className="text-muted-foreground">Loading…</p>;
  if (me.is("admin")) return <Navigate to="/admin" />;
  if (me.is("supplier")) return <Navigate to="/supplier" />;
  return <Navigate to="/vendor" />;
}
