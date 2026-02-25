// supabase/functions/factory-callback/index.ts
//
// GitHub Actions chama esta função quando o build termina.
// Atualiza o status no banco → front pega via Realtime.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_SECRET = Deno.env.get("CALLBACK_SECRET") || "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Factory-Secret",
      },
    });
  }

  try {
    // Validar secret
    const secret = req.headers.get("X-Factory-Secret");
    if (CALLBACK_SECRET && secret !== CALLBACK_SECRET) {
      return json({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { trace_id, module, status, message, release_url, api_url, run_id, timestamp } = body;

    if (!trace_id) {
      return json({ error: "trace_id obrigatório" }, 400);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Atualizar status do build
    const { error } = await supabase
      .from("factory_builds")
      .update({
        status,
        message,
        release_url,
        api_url,
        github_run_id: run_id,
        completed_at: timestamp || new Date().toISOString(),
      })
      .eq("trace_id", trace_id);

    if (error) {
      console.error("DB update error:", error);
      return json({ error: "Failed to update build status" }, 500);
    }

    return json({ success: true, trace_id, status });

  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
