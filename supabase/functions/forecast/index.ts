// GET /forecast — 7-day moving average forecast for egg production.
// Returns: { predicted_next_day_eggs, predicted_week_eggs, window_used, basis }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    // Pull last 7 records ordered by date desc
    const { data, error } = await supabase
      .from("daily_records")
      .select("date, eggs_collected")
      .order("date", { ascending: false })
      .limit(7);

    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          predicted_next_day_eggs: 0,
          predicted_week_eggs: 0,
          window_used: 0,
          basis: "no data",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 7-day moving average (or as many as we have)
    const sum = rows.reduce((a, r) => a + (r.eggs_collected ?? 0), 0);
    const avg = sum / rows.length;
    const nextDay = Math.round(avg);
    const week = Math.round(avg * 7);

    return new Response(
      JSON.stringify({
        predicted_next_day_eggs: nextDay,
        predicted_week_eggs: week,
        window_used: rows.length,
        basis: "7-day moving average",
        // Placeholder for future Prophet / time-series upgrade:
        // method: "prophet" would call out to a model service here.
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
