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
import { Bird, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { toast } from "sonner";

export const FlockSelector = () => {
  const { selectedFarm, flocks, selectedFlock, setSelectedFlockId, reloadFlocks } = useFarm();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ flock_name: "", start_date: new Date().toISOString().slice(0, 10), initial_birds: "0", breed: "" });
  const [editForm, setEditForm] = useState({ flock_name: "", start_date: "", initial_birds: "0", breed: "" });
  const [saving, setSaving] = useState(false);

  const openEdit = () => {
    if (!selectedFlock) return;
    setEditForm({
      flock_name: selectedFlock.flock_name,
      start_date: selectedFlock.start_date,
      initial_birds: String(selectedFlock.initial_birds),
      breed: selectedFlock.breed ?? "",
    });
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlock) return;
    setSaving(true);
    const { error } = await supabase.from("flocks").update({
      flock_name: editForm.flock_name.trim(),
      start_date: editForm.start_date,
      initial_birds: Number(editForm.initial_birds) || 0,
      breed: editForm.breed.trim() || null,
    }).eq("id", selectedFlock.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Flock updated");
    await reloadFlocks();
    setEditOpen(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm) return;
    setSaving(true);
    const { data, error } = await supabase.from("flocks").insert({
      farm_id: selectedFarm.id,
      flock_name: form.flock_name.trim(),
      start_date: form.start_date,
      initial_birds: Number(form.initial_birds) || 0,
      breed: form.breed.trim() || null,
    }).select().single();
    if (!error && data) {
      toast.success("Flock created");
      await reloadFlocks();
      setSelectedFlockId(data.id);
      setOpen(false);
      setForm({ flock_name: "", start_date: new Date().toISOString().slice(0, 10), initial_birds: "0", breed: "" });
    } else if (error) toast.error(error.message);
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Bird className="h-4 w-4 text-muted-foreground hidden sm:block" />
      <Select
        value={selectedFlock?.id ?? "all"}
        onValueChange={(v) => setSelectedFlockId(v === "all" ? null : v)}
      >
        <SelectTrigger className="h-9 w-[140px] sm:w-[180px]">
          <SelectValue placeholder="All flocks" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All flocks</SelectItem>
          {flocks.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.flock_name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Add flock" disabled={!selectedFarm}>
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New flock</DialogTitle></DialogHeader>
          <form onSubmit={create} className="space-y-3">
            <div>
              <Label className="text-xs">Flock name</Label>
              <Input value={form.flock_name} onChange={(e) => setForm({ ...form, flock_name: e.target.value })} required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Initial birds</Label>
                <Input type="number" min={0} value={form.initial_birds} onChange={(e) => setForm({ ...form, initial_birds: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Breed (optional)</Label>
              <Input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} className="mt-1" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving} className="w-full">Create flock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Edit flock" onClick={openEdit} disabled={!selectedFlock}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Edit flock</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div>
              <Label className="text-xs">Flock name</Label>
              <Input value={editForm.flock_name} onChange={(e) => setEditForm({ ...editForm, flock_name: e.target.value })} required className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Start date</Label>
                <Input type="date" value={editForm.start_date} onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Initial birds</Label>
                <Input type="number" min={0} value={editForm.initial_birds} onChange={(e) => setEditForm({ ...editForm, initial_birds: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Breed (optional)</Label>
              <Input value={editForm.breed} onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })} className="mt-1" />
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
