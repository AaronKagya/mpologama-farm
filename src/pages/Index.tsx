import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DailyRecord, Forecast, computeAlerts, exportToCSV } from "@/lib/farm";
import { KPICard } from "@/components/farm/KPICard";
import { TrendChart } from "@/components/farm/TrendChart";
import { RecordsTable } from "@/components/farm/RecordsTable";
import { RecordForm } from "@/components/farm/RecordForm";
import { AlertList } from "@/components/farm/AlertList";
import { ActivityLog } from "@/components/farm/ActivityLog";
import { UserMenu } from "@/components/farm/UserMenu";
import { FarmSwitcher } from "@/components/farm/FarmSwitcher";
import { FlockSelector } from "@/components/farm/FlockSelector";
import { FarmSettingsDialog } from "@/components/farm/FarmSettingsDialog";
import { FarmMembersDialog } from "@/components/farm/FarmMembersDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useFarm } from "@/hooks/useFarm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Egg, Activity, Heart, Wheat, Download, Sparkles, Feather, Sigma, Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const { selectedFarm, selectedFlock, flocks, loading: farmLoading } = useFarm();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!selectedFarm) { setRecords([]); setForecast(null); setLoading(false); return; }
    setLoading(true);
    const flockIds = selectedFlock ? [selectedFlock.id] : flocks.map((f) => f.id);
    if (flockIds.length === 0) { setRecords([]); setForecast(null); setLoading(false); return; }

    const [{ data, error }, fRes] = await Promise.all([
      supabase.from("daily_records").select("*").in("flock_id", flockIds).order("date", { ascending: false }),
      supabase.functions.invoke("forecast", {
        body: selectedFlock ? { flock_id: selectedFlock.id } : { farm_id: selectedFarm.id },
      }),
    ]);
    if (error) toast.error(error.message);
    setRecords((data as DailyRecord[]) ?? []);
    if (fRes.data) setForecast(fRes.data as Forecast);
    setLoading(false);
  }, [selectedFarm, selectedFlock, flocks]);

  useEffect(() => { load(); }, [load]);

  const latest = records[0];
  const alerts = computeAlerts(records);

  const totalEggs = records.reduce((sum, r) => sum + (r.eggs_collected ?? 0), 0);
  const totalProfit = records.reduce((sum, r) => sum + Number(r.profit ?? 0), 0);
  const prodRates = records.map((r) => Number(r.production_rate)).filter((n) => !Number.isNaN(n) && n > 0);
  const avgProduction = prodRates.length ? prodRates.reduce((a, b) => a + b, 0) / prodRates.length : 0;

  const downloadCSV = () => {
    const csv = exportToCSV(records);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFarm?.farm_name ?? "farm"}-records-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-primary p-2 text-primary-foreground shrink-0">
                <Feather className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base font-semibold tracking-tight truncate">LayerLens</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedFarm ? selectedFarm.farm_name : "Farm operating system"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <FarmSwitcher />
            <FlockSelector />
            <div className="flex-1" />
            <FarmMembersDialog />
            <FarmSettingsDialog />
            <Button variant="outline" size="sm" onClick={downloadCSV} className="gap-2">
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">CSV</span>
            </Button>
            <RecordForm onSaved={load} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        {farmLoading || loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !selectedFarm ? (
          <p className="text-sm text-muted-foreground">Create your first farm to get started.</p>
        ) : (
          <>
            {alerts.length > 0 && <AlertList alerts={alerts} />}

            <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KPICard label="Eggs today" value={latest ? latest.eggs_collected.toLocaleString() : "—"} hint={latest ? `${latest.broken_eggs} broken` : undefined} icon={Egg} tone="accent" />
              <KPICard label="Production" value={latest ? `${latest.production_rate}%` : "—"} hint="Hen-day rate" icon={Activity} tone="primary" />
              <KPICard label="Mortality" value={latest ? `${latest.mortality_rate}%` : "—"} hint={latest ? `${latest.deaths} deaths today` : undefined} icon={Heart} tone={latest && (latest.mortality_rate ?? 0) > 5 ? "danger" : "success"} />
              <KPICard label="Profit today" value={latest?.profit != null ? Number(latest.profit).toLocaleString() : "—"} hint={latest?.revenue != null ? `Rev ${Number(latest.revenue).toLocaleString()}` : "Set pricing"} icon={DollarSign} tone={latest && (latest.profit ?? 0) < 0 ? "danger" : "success"} />
              <KPICard label="Total eggs" value={totalEggs.toLocaleString()} hint={`${records.length} day${records.length === 1 ? "" : "s"}`} icon={Sigma} tone="accent" />
              <KPICard label="Avg production" value={records.length ? `${avgProduction.toFixed(1)}%` : "—"} hint="All records" icon={Percent} tone="primary" />
              <KPICard label="Total profit" value={totalProfit.toLocaleString()} hint="All records" icon={DollarSign} tone={totalProfit < 0 ? "danger" : "success"} />
              <KPICard label="Feed / egg" value={latest?.feed_efficiency ? `${latest.feed_efficiency} kg` : "—"} hint={latest ? `${latest.feed_kg} kg feed` : undefined} icon={Wheat} tone="warning" />
            </section>

            {forecast && (
              <Card className="flex flex-col gap-4 border-primary/20 bg-primary-soft/40 p-5 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary p-2 text-primary-foreground"><Sparkles className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-semibold">Production forecast</p>
                    <p className="text-xs text-muted-foreground">Based on {forecast.basis} ({forecast.window_used} days)</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Tomorrow</p>
                    <p className="text-2xl font-semibold tabular-nums">{forecast.predicted_next_day_eggs.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Next 7 days</p>
                    <p className="text-2xl font-semibold tabular-nums">{forecast.predicted_week_eggs.toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            )}

            <section className="grid gap-4 lg:grid-cols-3">
              <TrendChart records={records} title="Eggs collected" dataKey="eggs_collected" color="hsl(var(--chart-2))" />
              <TrendChart records={records} title="Production rate" dataKey="production_rate" color="hsl(var(--chart-1))" unit="%" />
              <TrendChart records={records} title="Profit" dataKey={"profit" as any} color="hsl(var(--chart-3))" />
            </section>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <RecordsTable records={records} onChanged={load} />
              </div>
              <ActivityLog />
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        LayerLens · Multi-farm operating system
      </footer>
    </div>
  );
};

export default Index;
