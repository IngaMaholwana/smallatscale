import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Stokvel.trade" },
      { name: "description", content: "Sign in or register your business to buy together or supply buying groups." },
      { property: "og:title", content: "Sign in — Stokvel.trade" },
      { property: "og:description", content: "Register as a vendor or supplier on Stokvel.trade." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [role, setRole] = useState("vendor");

  const signIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("password")) });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard" });
  };
  const signUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { role, full_name: f.get("full_name"), business_name: f.get("business_name"), phone: f.get("phone"), location: f.get("location") },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (data.session) navigate({ to: "/dashboard" });
    else setSent(true);
  };

  return (
    <div className="grid min-h-screen place-items-center bg-hero px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-card">
        <h1 className="mb-1 text-3xl font-semibold text-primary">Stokvel.trade</h1>
        <p className="mb-6 text-sm text-muted-foreground">Buy together. Pay wholesale.</p>
        {sent ? (
          <div className="rounded-lg bg-secondary p-4 text-sm">Check your email to confirm your account, then sign in.</div>
        ) : (
          <Tabs defaultValue="signin">
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3">
                <Field name="email" label="Email" type="email" />
                <Field name="password" label="Password" type="password" />
                <Button className="w-full" disabled={busy}>Sign in</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3">
                <Label>I am a…</Label>
                <RadioGroup value={role} onValueChange={setRole} className="grid grid-cols-2 gap-2">
                  {([["vendor", "Vendor", "I buy stock"], ["supplier", "Supplier", "I sell stock"]] as const).map(([v, t, d]) => (
                    <label key={v} className={`cursor-pointer rounded-lg border p-3 ${role === v ? "border-primary bg-secondary" : ""}`}>
                      <div className="flex items-center gap-2"><RadioGroupItem value={v} />{t}</div>
                      <div className="text-xs text-muted-foreground">{d}</div>
                    </label>
                  ))}
                </RadioGroup>
                <Field name="full_name" label="Your name" />
                <Field name="business_name" label="Business name" />
                <div className="grid grid-cols-2 gap-2">
                  <Field name="phone" label="Phone" type="tel" required={false} />
                  <Field name="location" label="Town / area" required={false} />
                </div>
                <Field name="email" label="Email" type="email" />
                <Field name="password" label="Password" type="password" />
                <Button className="w-full" disabled={busy}>Create account</Button>
                {role === "supplier" && <p className="text-xs text-muted-foreground">Suppliers are checked by an admin before products appear to vendors.</p>}
              </form>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

function Field({ name, label, type = "text", required = true }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required={required} minLength={type === "password" ? 8 : undefined} />
    </div>
  );
}
