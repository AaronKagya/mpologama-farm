import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: ures } = await userClient.auth.getUser();
    const caller = ures?.user;
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { farm_id, email, role } = body ?? {};
    if (!farm_id || !email) return json({ error: "farm_id and email are required" }, 400);
    const useRole = ["owner", "manager", "viewer"].includes(role) ? role : "viewer";

    const admin = createClient(url, service);

    // Verify caller is owner of the farm
    const { data: ownerCheck } = await admin
      .from("farm_members").select("role").eq("farm_id", farm_id).eq("user_id", caller.id).maybeSingle();
    if (!ownerCheck || ownerCheck.role !== "owner") {
      return json({ error: "Only farm owners can invite members" }, 403);
    }

    // Find target user by email via admin API
    const target = await findUserByEmail(admin, String(email).trim().toLowerCase());
    if (!target) return json({ error: "No user found with that email. They must sign up first." }, 404);

    const { error } = await admin.from("farm_members").upsert(
      { farm_id, user_id: target.id, role: useRole },
      { onConflict: "farm_id,user_id" },
    );
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, user_id: target.id, email: target.email });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  // listUsers paginates; search up to 10 pages of 1000 users
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
    if (found) return found;
    if (data.users.length < 1000) break;
  }
  return null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
