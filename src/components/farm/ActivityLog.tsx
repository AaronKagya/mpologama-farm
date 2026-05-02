import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { Activity, RefreshCw, LogIn, Plus, Pencil, Trash2 } from "lucide-react";

type Entry = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  entity: string;
  entity_date: string | null;
  details: any;
  created_at: string;
};

const actionMeta: Record<string, { icon: any; tone: string; label: string }> = {
  created: { icon: Plus, tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300", label: "Added" },
  updated: { icon: Pencil, tone: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300", label: "Edited" },
  deleted: { icon: Trash2, tone: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300", label: "Deleted" },
  signed_in: { icon: LogIn, tone: "bg-muted text-muted-foreground", label: "Signed in" },
};

const summarize = (e: Entry) => {
  if (e.action === "signed_in") return "Logged into the dashboard";
  const d = e.entity_date ? format(parseISO(e.entity_date), "MMM d, yyyy") : "";
  if (e.action === "created") {
    const eggs = e.details?.eggs_collected;
    return `Added record for ${d}${eggs != null ? ` (${eggs} eggs)` : ""}`;
  }
  if (e.action === "deleted") {
    return `Deleted record for ${d}`;
  }
  if (e.action === "updated") {
    const changes = e.details?.changes ?? {};
    const fields = Object.keys(changes);
    if (fields.length === 0) return `Edited record for ${d}`;
    const parts = fields.slice(0, 3).map((f) => {
      const c = changes[f];
      return `${f.replace(/_/g, " ")}: ${c.from ?? "—"} → ${c.to ?? "—"}`;
    });
    const more = fields.length > 3 ? ` +${fields.length - 3} more` : "";
    return `Edited record for ${d} — ${parts.join(", ")}${more}`;
  }
  return e.action;
};

export const ActivityLog = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("activity_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setEntries((data as any) ?? []);
    setLoading(false);
  }, []);

  // Log sign-in once per session per user
  useEffect(() => {
    if (!user) return;
    const key = `signin_logged_${user.id}_${user.created_at ?? ""}`;
    const sessionKey = `signin_session_${user.id}`;
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
    supabase
      .from("activity_log" as any)
      .insert({
        user_id: user.id,
        user_email: user.email,
        user_name: (user.user_metadata as any)?.display_name || (user.user_metadata as any)?.full_name || user.email?.split("@")[0],
        action: "signed_in",
        entity: "session",
      } as any)
      .then(() => load());
  }, [user, load]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("activity_log_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  return (
    <Card className="shadow-[var(--shadow-card)] border-border/60 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity log</h3>
          <span className="text-xs text-muted-foreground">· who did what & when</span>
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="h-7 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>
      <ScrollArea className="h-[360px]">
        <ul className="divide-y divide-border/60">
          {entries.length === 0 && !loading && (
            <li className="p-6 text-center text-sm text-muted-foreground">No activity yet.</li>
          )}
          {entries.map((e) => {
            const meta = actionMeta[e.action] ?? { icon: Activity, tone: "bg-muted text-muted-foreground", label: e.action };
            const Icon = meta.icon;
            const name = e.user_name || e.user_email || "Unknown user";
            return (
              <li key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30">
                <div className={`mt-0.5 rounded-md p-1.5 ${meta.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-medium">{name}</span>
                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{meta.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(e.created_at), "MMM d, yyyy · HH:mm")}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground break-words">{summarize(e)}</p>
                  {e.user_email && e.user_email !== name && (
                    <p className="text-[11px] text-muted-foreground/70">{e.user_email}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </Card>
  );
};
