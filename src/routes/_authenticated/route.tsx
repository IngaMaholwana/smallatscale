import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Notifications } from "@/components/app/Notifications";
import { useMe } from "@/lib/session";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Shell,
});

function Shell() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const link = "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground";
  const active = { className: "rounded-md px-3 py-1.5 text-sm font-medium bg-secondary text-secondary-foreground" };
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/dashboard" className="font-display text-xl font-semibold text-primary">Stokvel<span className="text-accent">.</span>trade</Link>
          <nav className="flex flex-1 flex-wrap gap-1">
            {me?.is("vendor") && (<>
              <Link to="/vendor" className={link} activeProps={active}>My dashboard</Link>
              <Link to="/catalogue" className={link} activeProps={active}>Catalogue</Link>
              <Link to="/groups" className={link} activeProps={active}>Open groups</Link>
            </>)}
            {me?.is("supplier") && <Link to="/supplier" className={link} activeProps={active}>Supplier</Link>}
            {me?.is("admin") && <Link to="/admin" className={link} activeProps={active}>Admin</Link>}
          </nav>
          {me && <Notifications userId={me.user.id} />}
          <span className="hidden text-sm text-muted-foreground md:inline">{me?.profile?.business_name}</span>
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8"><Outlet /></main>
    </div>
  );
}
