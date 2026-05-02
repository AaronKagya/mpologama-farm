import { Card } from "@/components/ui/card";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { DailyRecord } from "@/lib/farm";

interface Props {
  records: DailyRecord[];
  title: string;
  dataKey: keyof DailyRecord;
  color: string;
  unit?: string;
}

export const TrendChart = ({ records, title, dataKey, color, unit = "" }: Props) => {
  // Recharts wants ascending order
  const data = [...records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      date: format(parseISO(r.date), "MMM d"),
      value: Number(r[dataKey] ?? 0),
    }));

  return (
    <Card className="p-5 shadow-[var(--shadow-card)] border-border/60">
      <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: number) => [`${v}${unit}`, title]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
