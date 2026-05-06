import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, ArrowUpDown, Search, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DailyRecord } from "@/lib/farm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecordForm } from "./RecordForm";

interface Props {
  records: DailyRecord[];
  onChanged: () => void;
}

type SortKey = "date" | "eggs_collected" | "production_rate" | "mortality_rate";

export const RecordsTable = ({ records, onChanged }: Props) => {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [asc, setAsc] = useState(false);
  const [filter, setFilter] = useState("");
  const [editing, setEditing] = useState<DailyRecord | null>(null);

  const filtered = records.filter((r) =>
    filter ? r.date.includes(filter) : true,
  );
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return asc ? cmp : -cmp;
  });

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc((s) => !s);
    else { setSortKey(k); setAsc(false); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("daily_records").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Record deleted");
    onChanged();
  };

  const HeaderBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
      {label} <ArrowUpDown className="h-3 w-3 opacity-60" />
    </button>
  );

  return (
    <Card className="shadow-[var(--shadow-card)] border-border/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
        <h3 className="text-sm font-semibold">History</h3>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by date (YYYY-MM)"
            className="h-8 pl-8 text-xs w-56"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium"><HeaderBtn k="date" label="Date" /></th>
              <th className="px-4 py-2.5 text-right font-medium">Hens</th>
              <th className="px-4 py-2.5 text-right font-medium"><HeaderBtn k="eggs_collected" label="Eggs" /></th>
              <th className="px-4 py-2.5 text-right font-medium">Broken</th>
              <th className="px-4 py-2.5 text-right font-medium">Feed kg</th>
              <th className="px-4 py-2.5 text-right font-medium">Deaths</th>
              <th className="px-4 py-2.5 text-right font-medium"><HeaderBtn k="production_rate" label="Prod %" /></th>
              <th className="px-4 py-2.5 text-right font-medium"><HeaderBtn k="mortality_rate" label="Mort %" /></th>
              <th className="px-4 py-2.5 text-right font-medium">Feed/egg</th>
              <th className="px-4 py-2.5 text-right font-medium">Profit</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">{format(parseISO(r.date), "MMM d, yyyy")}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.hens_alive}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.eggs_collected}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.broken_eggs}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{Number(r.feed_kg).toFixed(1)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.deaths}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.production_rate}%</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.mortality_rate}%</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.feed_efficiency ?? "—"}</td>
                <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${(r.profit ?? 0) < 0 ? "text-destructive" : ""}`}>
                  {r.profit != null ? Number(r.profit).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(r.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={11} className="p-8 text-center text-sm text-muted-foreground">No records yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
