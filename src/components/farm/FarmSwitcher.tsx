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
import { Building2, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFarm } from "@/hooks/useFarm";
import { toast } from "sonner";

export const FarmSwitcher = () => {
  const { user } = useAuth();
  const { farms, selectedFarm, setSelectedFarmId, reloadFarms } = useFarm();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    if (!selectedFarm) return;
    setEditName(selectedFarm.farm_name);
    setEditLocation(selectedFarm.location ?? "");
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("farms")
      .update({ farm_name: editName.trim(), location: editLocation.trim() || null })
      .eq("id", selectedFarm.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Farm updated");
    await reloadFarms();
    setEditOpen(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("farms")
      .insert({ user_id: user.id, farm_name: name.trim(), location: location.trim() || null })
      .select().single();
    if (!error && data) {
      await supabase.from("farm_members" as any).insert({ farm_id: data.id, user_id: user.id, role: "owner" } as any);
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
      <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Edit farm" onClick={openEdit} disabled={!selectedFarm}>
        <Pencil className="h-4 w-4" />
      </Button>
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
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit farm</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <Label className="text-xs">Farm name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Location (optional)</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
