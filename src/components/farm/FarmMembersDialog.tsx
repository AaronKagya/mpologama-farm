import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFarm } from "@/hooks/useFarm";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Member = {
  id: string;
  user_id: string;
  role: "owner" | "manager" | "viewer";
  created_at: string;
  display_name?: string | null;
};

export const FarmMembersDialog = () => {
  const { user } = useAuth();
  const { selectedFarm } = useFarm();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"viewer" | "manager" | "owner">("viewer");
  const [busy, setBusy] = useState(false);

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const isOwner = myRole === "owner";

  const load = async () => {
    if (!selectedFarm) return;
    const { data: mems } = await supabase
      .from("farm_members" as any).select("*").eq("farm_id", selectedFarm.id) as any;
    const list = (mems ?? []) as Member[];
    if (list.length) {
      const ids = list.map((m) => m.user_id);
      const { data: profs } = await supabase
        .from("profiles").select("user_id, display_name").in("user_id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.user_id, p.display_name]));
      list.forEach((m) => (m.display_name = byId.get(m.user_id) ?? null));
    }
    setMembers(list);
  };

  useEffect(() => { if (open) load(); }, [open, selectedFarm?.id]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !email.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("farm-add-member", {
      body: { farm_id: selectedFarm.id, email: email.trim(), role },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Failed to add member");
      return;
    }
    toast.success("Member added");
    setEmail("");
    load();
  };

  const updateRole = async (m: Member, newRole: Member["role"]) => {
    const { error } = await supabase
      .from("farm_members" as any).update({ role: newRole } as any).eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    load();
  };

  const remove = async (m: Member) => {
    if (!confirm(`Remove ${m.display_name || "this user"} from the farm?`)) return;
    const { error } = await supabase.from("farm_members" as any).delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  };

  if (!selectedFarm) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" /> <span className="hidden sm:inline">Members</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{selectedFarm.farm_name} · members</DialogTitle>
        </DialogHeader>

        <ul className="divide-y divide-border/60 rounded-md border border-border/60">
          {members.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No members yet.</li>
          )}
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-2 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {m.display_name || m.user_id.slice(0, 8)}
                  {m.user_id === user?.id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                </p>
              </div>
              {isOwner && m.user_id !== user?.id ? (
                <Select value={m.role} onValueChange={(v) => updateRole(m, v as Member["role"])}>
                  <SelectTrigger className="h-8 w-[110px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
              )}
              {isOwner && m.user_id !== user?.id && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(m)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>

        {isOwner ? (
          <form onSubmit={invite} className="space-y-2 border-t border-border/60 pt-3">
            <Label className="text-xs">Add member by email</Label>
            <div className="flex gap-2">
              <Input type="email" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Select value={role} onValueChange={(v) => setRole(v as any)}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-[11px] text-muted-foreground">
              The user must already have an account on this app.
            </p>
            <DialogFooter>
              <Button type="submit" disabled={busy} className="w-full">Add member</Button>
            </DialogFooter>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">Only farm owners can invite or remove members.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
