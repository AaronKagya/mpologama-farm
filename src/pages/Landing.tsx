import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Feather, Egg, Activity, Heart, Wheat, Sparkles, DollarSign,
  Users, ShieldCheck, BarChart3, Smartphone, ArrowRight, Check,
} from "lucide-react";

const features = [
  { icon: Egg, title: "Daily egg & flock tracking", desc: "Log eggs collected, broken, feed, water, deaths in seconds — from any device." },
  { icon: Activity, title: "Auto-computed KPIs", desc: "Hen-day production, mortality, and feed efficiency calculated as you enter data." },
  { icon: DollarSign, title: "Profit per day", desc: "Set your tray price and feed cost — see revenue, cost and profit per flock automatically." },
  { icon: Sparkles, title: "Production forecasting", desc: "7-day moving-average forecast tells you what tomorrow and next week look like." },
  { icon: Users, title: "Multi-user farms", desc: "Invite managers and viewers. Owners control roles. Every change is logged." },
  { icon: ShieldCheck, title: "Smart alerts", desc: "Instant warnings when production drops, mortality spikes, or eggs fall sharply." },
];

const steps = [
  { n: "01", title: "Create your farm", desc: "Add a farm, set your flocks, breed and start date." },
  { n: "02", title: "Log daily records", desc: "Enter eggs, feed and deaths each morning. Optimised for mobile." },
  { n: "03", title: "Read the insights", desc: "Dashboard shows trends, alerts, profit and forecasts in real time." },
];

const Landing = () => {
  const { user } = useAuth();
  const primaryHref = user ? "/dashboard" : "/auth";
  const primaryLabel = user ? "Open dashboard" : "Get started free";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-2 text-primary-foreground">
              <Feather className="h-5 w-5" />
            </div>
            <span className="font-semibold tracking-tight">Mpologoma Farm</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            {!user && (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm">
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, hsl(var(--primary-soft)) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Built for poultry farmers in Uganda
            </span>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              The farm operating system for layer flocks
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Track eggs, feed, mortality and profit across every farm and flock you run —
              with daily insights, alerts and forecasts that pay for themselves.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to={primaryHref}>{primaryLabel} <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features">See features</a>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">No credit card required · Free to start</p>
          </div>

          {/* Mock KPI strip */}
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: Egg, label: "Eggs today", value: "2,140" },
              { icon: Activity, label: "Production", value: "86.4%" },
              { icon: Heart, label: "Mortality", value: "0.3%" },
              { icon: DollarSign, label: "Profit", value: "UGX 184k" },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <k.icon className="h-4 w-4" />
                  <span className="text-xs">{k.label}</span>
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums">{k.value}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to run a profitable farm</h2>
            <p className="mt-3 text-muted-foreground">Purpose-built for layer-poultry operations. Simple enough for daily use, powerful enough to grow with you.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="p-5">
                <div className="inline-flex rounded-lg bg-primary-soft p-2 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">From first egg to full insight in minutes</h2>
            <p className="mt-3 text-muted-foreground">Three simple steps, then the dashboard takes care of the rest.</p>
          </div>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-mono text-primary">{s.n}</span>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Why us */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built for African farms</h2>
            <p className="mt-3 text-muted-foreground">
              Local pricing in your currency, mobile-first design that works on any phone,
              and offline-friendly entry so a poor signal never stops the records.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Multi-farm, multi-flock from day one",
                "Owner / Manager / Viewer roles with full audit log",
                "Set your own egg tray and feed prices",
                "Works on any phone — no install required",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Forecast preview</span>
            </div>
            <p className="mt-3 text-sm">Tomorrow</p>
            <p className="text-3xl font-semibold tabular-nums">2,205 <span className="text-base font-normal text-muted-foreground">eggs</span></p>
            <p className="mt-4 text-sm">Next 7 days</p>
            <p className="text-3xl font-semibold tabular-nums">15,310 <span className="text-base font-normal text-muted-foreground">eggs</span></p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-success-soft p-3">
                <Wheat className="h-4 w-4 text-success" />
                <p className="mt-1 font-medium">Feed/egg</p>
                <p className="text-muted-foreground">0.13 kg</p>
              </div>
              <div className="rounded-lg bg-accent-soft p-3">
                <Smartphone className="h-4 w-4 text-accent" />
                <p className="mt-1 font-medium">Mobile-first</p>
                <p className="text-muted-foreground">Works anywhere</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Simple pricing</h2>
          <p className="mt-3 text-muted-foreground">Start free. Upgrade when your flock grows.</p>
          <Card className="mx-auto mt-8 max-w-md p-6 text-left">
            <p className="text-sm font-medium text-primary">Starter</p>
            <p className="mt-1 text-4xl font-semibold">Free</p>
            <p className="mt-1 text-sm text-muted-foreground">Up to 1 farm and 2 flocks</p>
            <ul className="mt-5 space-y-2 text-sm">
              {["Daily records & KPIs", "Forecast & alerts", "CSV export", "1 owner + invite team"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-6 w-full">
              <Link to={primaryHref}>{primaryLabel}</Link>
            </Button>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-center sm:px-6 md:flex-row md:text-left">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Run your farm like a business</h3>
            <p className="text-sm opacity-90">Join farmers using Mpologoma to track every egg and every shilling.</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="gap-2">
            <Link to={primaryHref}>{primaryLabel} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Mpologoma Farm · Multi-farm operating system
      </footer>
    </div>
  );
};

export default Landing;
