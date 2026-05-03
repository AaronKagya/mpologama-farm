// POST /forecast — 7-day moving average forecast for a flock or farm.
// Body: { flock_id?: string, farm_id?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );

    let body: { flock_id?: string; farm_id?: string } = {};
    try { body = await req.json(); } catch (_) { /* GET fallback */ }

    let q = supabase
      .from("daily_records")
      .select("date, eggs_collected, flock_id, flocks!inner(farm_id)")
      .order("date", { ascending: false })
      .limit(7);

    if (body.flock_id) q = q.eq("flock_id", body.flock_id);
    else if (body.farm_id) q = q.eq("flocks.farm_id", body.farm_id);

    const { data, error } = await q;
    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({
        predicted_next_day_eggs: 0, predicted_week_eggs: 0,
        window_used: 0, basis: "no data",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const sum = rows.reduce((a, r: any) => a + (r.eggs_collected ?? 0), 0);
    const avg = sum / rows.length;

    return new Response(JSON.stringify({
      predicted_next_day_eggs: Math.round(avg),
      predicted_week_eggs: Math.round(avg * 7),
      window_used: rows.length,
      basis: "7-day moving average",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
