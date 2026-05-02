import { Alert as AlertType } from "@/lib/farm";
import { AlertTriangle, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export const AlertList = ({ alerts }: { alerts: AlertType[] }) => {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a, i) => {
        const isDanger = a.level === "danger";
        const Icon = isDanger ? OctagonAlert : AlertTriangle;
        return (
          <div
            key={i}
            className={cn(
              "flex items-start gap-3 rounded-lg border p-3.5",
              isDanger
                ? "border-destructive/30 bg-destructive-soft text-destructive"
                : "border-warning/30 bg-warning-soft text-warning-foreground",
            )}
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", isDanger ? "text-destructive" : "text-warning")} />
            <div>
              <p className="text-sm font-semibold">{a.title}</p>
              <p className="text-sm opacity-90">{a.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
