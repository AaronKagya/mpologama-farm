import { useState } from "react";
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

export const RecordForm = ({ onSaved }: { onSaved: () => void }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    hens_alive: "",
    eggs_collected: "",
    broken_eggs: "0",
    feed_kg: "",
    water_liters: "",
    deaths: "0",
  });

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const payload = {
      ...parsed.data,
      water_liters:
        parsed.data.water_liters === "" || parsed.data.water_liters === undefined
          ? null
          : Number(parsed.data.water_liters),
    };
    const { error } = await supabase.from("daily_records").upsert([payload], { onConflict: "date" });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Record saved");
    setOpen(false);
    setForm({ date: today(), hens_alive: "", eggs_collected: "", broken_eggs: "0", feed_kg: "", water_liters: "", deaths: "0" });
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
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New entry
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Daily record</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "date" ? "col-span-2" : ""}>
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
                className="mt-1"
              />
            </div>
          ))}
          <p className="col-span-2 text-xs text-muted-foreground">
            Production %, mortality % and feed efficiency are calculated automatically on save.
          </p>
          <DialogFooter className="col-span-2 mt-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
