import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Settings, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { toast } from "sonner";

export const FarmSettingsDialog = () => {
  const { selectedFarm } = useFarm();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState("");
  const [feedCost, setFeedCost] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !selectedFarm) return;
    supabase.from("farm_settings").select("*").eq("farm_id", selectedFarm.id).maybeSingle()
      .then(({ data }) => {
        setPrice(String(data?.price_per_tray ?? 13000));
        setFeedCost(String(data?.feed_cost_per_kg ?? 2200));
      });
  }, [open, selectedFarm]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setSaving(true);
    const { error } = await supabase.from("farm_settings").upsert({
      farm_id: selectedFarm.id,
      price_per_tray: Number(price) || 0,
      feed_cost_per_kg: Number(feedCost) || 0,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved. Future records will use new prices.");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" disabled={!selectedFarm}>
          <Settings className="h-4 w-4" /> <span className="hidden sm:inline">Pricing</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pricing for {selectedFarm?.farm_name}</DialogTitle>
          <DialogDescription>Used to calculate revenue and profit on each daily record.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div>
            <Label className="text-xs">Price per tray of 30 eggs (UGX)</Label>
            <Input type="number" min={0} step="1" value={price} onChange={(e) => setPrice(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Feed cost per kg (UGX)</Label>
            <Input type="number" min={0} step="1" value={feedCost} onChange={(e) => setFeedCost(e.target.value)} className="mt-1" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
