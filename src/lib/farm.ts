export type DailyRecord = {
  id: string;
  date: string;
  hens_alive: number;
  eggs_collected: number;
  broken_eggs: number;
  feed_kg: number;
  water_liters: number | null;
  deaths: number;
  production_rate: number | null;
  mortality_rate: number | null;
  feed_efficiency: number | null;
  created_at: string;
};

export type Forecast = {
  predicted_next_day_eggs: number;
  predicted_week_eggs: number;
  window_used: number;
  basis: string;
};

export type Alert = {
  level: "warning" | "danger";
  title: string;
  message: string;
};

/** Compute alerts from the most recent records. */
export function computeAlerts(records: DailyRecord[]): Alert[] {
  if (records.length === 0) return [];
  // records are sorted desc by date
  const latest = records[0];
  const prev = records[1];
  const alerts: Alert[] = [];

  if ((latest.production_rate ?? 0) < 70) {
    alerts.push({
      level: "danger",
      title: "Low production",
      message: `Hen-day production at ${latest.production_rate}% (below 70%).`,
    });
  }

  if ((latest.mortality_rate ?? 0) > 5) {
    alerts.push({
      level: "danger",
      title: "High mortality",
      message: `Mortality at ${latest.mortality_rate}% (above 5%).`,
    });
  }

  if (prev && prev.eggs_collected > 0) {
    const drop =
      ((prev.eggs_collected - latest.eggs_collected) / prev.eggs_collected) *
      100;
    if (drop > 15) {
      alerts.push({
        level: "warning",
        title: "Sudden egg drop",
        message: `Eggs fell ${drop.toFixed(1)}% vs previous day.`,
      });
    }
  }

  return alerts;
}

export function exportToCSV(records: DailyRecord[]): string {
  const headers = [
    "date","hens_alive","eggs_collected","broken_eggs","feed_kg","water_liters","deaths",
    "production_rate","mortality_rate","feed_efficiency",
  ];
  const lines = [headers.join(",")];
  for (const r of records) {
    lines.push(headers.map((h) => (r as any)[h] ?? "").join(","));
  }
  return lines.join("\n");
}
