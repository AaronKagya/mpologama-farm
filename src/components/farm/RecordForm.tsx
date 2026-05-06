import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useFarm } from "@/hooks/useFarm";
import { DailyRecord } from "@/lib/farm";

const schema = z.object({
  date: z.string().min(1, "Date required"),
  hens_alive: z.coerce.number().int().min(0, "No negatives"),
  eggs_collected: z.coerce.number().int().min(0, "No negatives"),
  broken_eggs: z.coerce.number().int().min(0, "No negatives"),
  feed_kg: z.coerce.number().min(0, "No negatives"),
  water_liters: z.coerce.number().min(0, "No negatives").optional().or(z.literal("")),
  deaths: z.coerce.number().int().min(0, "No negatives"),
});

const today = () => new Date().toISOString().slice(0, 10);

const empty = { date: today(), hens_alive: "", eggs_collected: "", broken_eggs: "0", feed_kg: "", water_liters: "", deaths: "0" };

interface Props {
  onSaved: () => void;
  record?: DailyRecord | null;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactNode;
}

export const RecordForm = ({ onSaved, record, open: openProp, onOpenChange, trigger }: Props) => {
  const { selectedFlock, flocks } = useFarm();
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp ?? openInternal;
  const setOpen = onOpenChange ?? setOpenInternal;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open && record) {
      setForm({
        date: record.date,
        hens_alive: String(record.hens_alive),
        eggs_collected: String(record.eggs_collected),
        broken_eggs: String(record.broken_eggs),
        feed_kg: String(record.feed_kg),
        water_liters: record.water_liters != null ? String(record.water_liters) : "",
        deaths: String(record.deaths),
      });
    } else if (open && !record) {
      setForm(empty);
    }
  }, [open, record]);

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const targetFlock = record ? flocks.find((f) => f.id === record.flock_id) ?? selectedFlock : (selectedFlock ?? flocks[0]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetFlock) { toast.error("Create a flock first"); return; }
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const d = parsed.data;
    const payload = {
      flock_id: targetFlock.id,
      date: d.date,
      hens_alive: d.hens_alive,
      eggs_collected: d.eggs_collected,
      broken_eggs: d.broken_eggs,
      feed_kg: d.feed_kg,
      deaths: d.deaths,
      water_liters: d.water_liters === "" || d.water_liters === undefined ? null : Number(d.water_liters),
    };
    const { error } = record
      ? await supabase.from("daily_records").update(payload).eq("id", record.id)
      : await supabase.from("daily_records").upsert(payload, { onConflict: "flock_id,date" });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(record ? "Record updated" : "Record saved");
    setOpen(false);
    setForm(empty);
    onSaved();
  };

  const fields: { key: keyof typeof form; label: string; type?: string; optional?: boolean }[] = [
    { key: "date", label: "Date", type: "date" },
    { key: "hens_alive", label: "Hens alive", type: "number" },
    { key: "eggs_collected", label: "Eggs collected", type: "number" },
    { key: "broken_eggs", label: "Broken eggs", type: "number" },
    { key: "feed_kg", label: "Feed (kg)", type: "number" },
    { key: "water_liters", label: "Water (L)", type: "number", optional: true },
    { key: "deaths", label: "Mortality (deaths)", type: "number" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== undefined ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !record && (
        <DialogTrigger asChild>
          <Button className="gap-2" disabled={!targetFlock}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New entry</span><span className="sm:hidden">New</span>
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-base">
            {record ? "Edit record" : "Daily record"}
            {targetFlock && <span className="text-xs font-normal text-muted-foreground"> · {targetFlock.flock_name}</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "date" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.key} className="text-xs">
                {f.label} {f.optional && <span className="text-muted-foreground">(optional)</span>}
              </Label>
              <Input
                id={f.key}
                type={f.type ?? "text"}
                value={form[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
                min={f.type === "number" ? 0 : undefined}
                step={f.key === "feed_kg" || f.key === "water_liters" ? "0.01" : "1"}
                required={!f.optional}
                inputMode={f.type === "number" ? "decimal" : undefined}
                className="mt-1"
              />
            </div>
          ))}
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Production %, mortality %, feed efficiency and profit are calculated automatically.
          </p>
          <DialogFooter className="sm:col-span-2 mt-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {record ? "Update record" : "Save record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
