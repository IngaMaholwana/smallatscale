import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { rand } from "@/lib/pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Stokvel.trade — Group buying for small businesses" },
      { name: "description", content: "Independent shops pool orders to unlock wholesale tier pricing from verified suppliers." },
      { property: "og:title", content: "Stokvel.trade — Group buying for small businesses" },
      { property: "og:description", content: "Pool orders, hit the minimum, unlock wholesale prices." },
    ],
  }),
  component: Index,
});

const steps = ["Supplier lists tiers", "Vendor starts a group", "Others join", "Minimum hit", "Supplier confirms", "Members pay", "Supplier fulfils", "Collected"];

function Index() {
  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-2xl font-semibold text-primary">Stokvel<span className="text-accent">.</span>trade</span>
        <Button asChild variant="outline"><Link to="/auth">Sign in</Link></Button>
      </header>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">Collective buying</p>
          <h1 className="text-5xl font-semibold leading-[1.05] md:text-6xl">Ten small shops.<br />One wholesale price.</h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">Pool your orders with other vendors, reach the supplier's minimum together, and everyone pays the bulk rate.</p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/auth">Start buying together</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">I'm a supplier</Link></Button>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-card">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Cooking oil 5L · 50 cartons</div>
          <dl className="mt-4 space-y-3 ledger-num">
            <div className="flex justify-between"><dt>Buying alone</dt><dd className="line-through text-muted-foreground">{rand(12500)}</dd></div>
            <div className="flex justify-between"><dt>Buying together</dt><dd className="font-semibold">{rand(11000)}</dd></div>
            <div className="flex justify-between border-t pt-3 text-lg"><dt className="font-display">Group saving</dt><dd className="font-bold text-primary">{rand(1500)}</dd></div>
          </dl>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <ol className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {steps.map((s, i) => (
            <li key={s} className="rounded-lg border bg-card/70 p-3 text-sm"><span className="block font-display text-2xl text-accent">{i + 1}</span>{s}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
