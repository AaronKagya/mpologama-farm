# Layer Farm Dashboard

Full-stack poultry (layer) farm management dashboard built on **React + Vite + TypeScript + Tailwind** (frontend) and **Lovable Cloud** (Postgres + Edge Functions) on the backend.

> Note: The original spec called for Flask + SQLite. Lovable's hosted environment runs only TypeScript/JS on the server side, so the Flask backend was implemented as a **Deno Edge Function** with the same `GET /forecast` contract. The database is **Postgres** (upgrade-path was already required by the spec).

## Features

- 📋 Daily data entry form (date, hens alive, eggs, broken, feed kg, water L, deaths)
- 🧮 Auto-computed KPIs server-side via Postgres trigger:
  - Hen-Day Production %
  - Mortality Rate %
  - Feed Efficiency (kg/egg)
- 📊 Trend charts (Recharts): eggs over time, production %, feed efficiency
- 📈 7-day moving-average forecast (`/forecast` edge function)
- 🚨 Alerts: production < 70%, mortality > 5%, sudden egg drop > 15%
- 🗂 Sortable & filterable history table with delete
- ⬇️ CSV export
- ✅ Negative-value validation enforced both in the form (Zod) and at the database

## API

The forecast endpoint is callable via the Supabase functions client:

```ts
const { data } = await supabase.functions.invoke("forecast");
// → { predicted_next_day_eggs, predicted_week_eggs, window_used, basis }
```

CRUD on records uses the standard Supabase JS client (`from("daily_records")`).

## Data model

`daily_records`: `date` (unique), `hens_alive`, `eggs_collected`, `broken_eggs`, `feed_kg`, `water_liters`, `deaths`, plus auto-computed `production_rate`, `mortality_rate`, `feed_efficiency`, and `created_at`.

## Local dev

```bash
bun install
bun run dev
```
