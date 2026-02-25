// supabase/functions/trigger-factory/index.ts
//
// Edge Function que o FRONT chama para disparar a fábrica.
// Recebe o pedido do usuário → dispara GitHub Actions → salva status no banco.
//
// POST /functions/v1/trigger-factory
// Body: { module, trace_id, blueprint_run_id, engineer_state, auto_deploy }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GITHUB_TOKEN = Deno.env.get("GITHUB_PAT")!;
const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER")!;
const GITHUB_REPO = Deno.env.get("GITHUB_REPO")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CALLBACK_SECRET = Deno.env.get("CALLBACK_SECRET") || "";

Deno.serve(async (req) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json();
    const {
      module,
      trace_id,
      blueprint_run_id,
      engineer_state = "NORMAL",
      max_heal = "5",
      auto_deploy = true,
      deploy_target = "supabase",
    } = body;

    // Validar campos obrigatórios
    if (!module || !trace_id || !blueprint_run_id) {
      return json({ error: "module, trace_id e blueprint_run_id são obrigatórios" }, 400);
    }

    // Callback URL = esta mesma Edge Function de status
    const callback_url = `${SUPABASE_URL}/functions/v1/factory-callback`;

    // ── 1. Disparar GitHub Actions ──────────────────────────
    const ghResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/factory.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ref: "main",
          inputs: {
            module_name: module,
            trace_id: trace_id,
            blueprint_run_id: String(blueprint_run_id),
            callback_url: callback_url,
            engineer_state: engineer_state,
            max_heal: String(max_heal),
            auto_deploy: String(auto_deploy),
            deploy_target: deploy_target,
          },
        }),
      }
    );

    if (!ghResponse.ok) {
      const err = await ghResponse.text();
      return json({ error: `GitHub Actions falhou: ${err}` }, 502);
    }

    // ── 2. Salvar build no banco ────────────────────────────
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { error: dbError } = await supabase.from("factory_builds").insert({
      trace_id,
      module,
      engineer_state,
      auto_deploy,
      deploy_target,
      status: "triggered",
      triggered_at: new Date().toISOString(),
      callback_url,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      // Não falha — o build já foi disparado
    }

    return json({
      success: true,
      trace_id,
      module,
      status: "triggered",
      message: `Fábrica disparada para módulo "${module}". Acompanhe pelo trace_id.`,
    });

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
