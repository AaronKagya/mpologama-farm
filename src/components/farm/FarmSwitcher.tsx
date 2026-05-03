import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFarm } from "@/hooks/useFarm";
import { toast } from "sonner";

export const FarmSwitcher = () => {
  const { user } = useAuth();
  const { farms, selectedFarm, setSelectedFarmId, reloadFarms } = useFarm();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("farms")
      .insert({ user_id: user.id, farm_name: name.trim(), location: location.trim() || null })
      .select().single();
    if (!error && data) {
      await supabase.from("farm_settings").insert({ farm_id: data.id });
      await supabase.from("flocks").insert({ farm_id: data.id, flock_name: "Flock 1" });
      toast.success("Farm created");
      await reloadFarms();
      setSelectedFarmId(data.id);
      setOpen(false);
      setName(""); setLocation("");
    } else if (error) toast.error(error.message);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select value={selectedFarm?.id ?? ""} onValueChange={setSelectedFarmId}>
        <SelectTrigger className="h-9 w-[160px] sm:w-[200px]">
          <SelectValue placeholder="Select farm" />
        </SelectTrigger>
        <SelectContent>
          {farms.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.farm_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Add farm">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New farm</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label className="text-xs">Farm name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Location (optional)</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full">Create farm</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
