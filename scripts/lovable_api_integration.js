/**
 * LAI Software Factory — API Integration Layer
 * 
 * Conecta o frontend Lovable com os GitHub Actions workflows.
 * 
 * COMO USAR NO LOVABLE:
 * 1. Configure GITHUB_PAT e GITHUB_REPO nas env vars do projeto
 * 2. Importe este módulo no seu componente
 * 3. Use startBuild() para iniciar e pollStatus() para acompanhar
 */

const GITHUB_API = "https://api.github.com";
const REPO = "SEU_USUARIO/lai-software-factory"; // ← CONFIGURE AQUI
// No Lovable: use import.meta.env.VITE_GITHUB_PAT
const PAT = ""; // ← Será configurado via env var

// ──────────────────────────────────────────────────
// 1. INICIAR BUILD (dispara pre-factory.yml)
// ──────────────────────────────────────────────────
export async function startBuild({ request, moduleName, mode = "DILIGENCE" }) {
  const traceId = `TRC-${Date.now().toString(36).toUpperCase()}`;

  const response = await fetch(
    `${GITHUB_API}/repos/${REPO}/actions/workflows/pre-factory.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          user_request: request,
          mode: mode,
          module_name: moduleName,
          trace_id: traceId,
          callback_url: "", // opcional: URL do seu webhook
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  // workflow_dispatch retorna 204 (sem body)
  // Precisamos buscar o run_id via polling
  const runId = await findLatestRun("pre-factory.yml", traceId);

  return {
    buildId: runId,
    traceId,
    status: "queued",
    phase: "pre-factory",
  };
}

// ──────────────────────────────────────────────────
// 2. CONSULTAR STATUS (poll GitHub Actions)
// ──────────────────────────────────────────────────
export async function pollStatus(runId) {
  const response = await fetch(
    `${GITHUB_API}/repos/${REPO}/actions/runs/${runId}`,
    {
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) throw new Error(`Status error: ${response.status}`);
  const run = await response.json();

  // Mapear status do GitHub para nosso pipeline
  const phase = mapGitHubStatus(run);

  return {
    buildId: runId,
    status: run.status, // queued, in_progress, completed
    conclusion: run.conclusion, // success, failure, null
    phase: phase,
    progress: phaseToProgress(phase),
    logsUrl: run.html_url,
    artifacts: run.conclusion === "success" ? await getArtifacts(runId) : [],
  };
}

// ──────────────────────────────────────────────────
// 3. BUSCAR ARTIFACTS (download links)
// ──────────────────────────────────────────────────
export async function getArtifacts(runId) {
  const response = await fetch(
    `${GITHUB_API}/repos/${REPO}/actions/runs/${runId}/artifacts`,
    {
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) return [];
  const data = await response.json();

  return data.artifacts.map((a) => ({
    name: a.name,
    size: a.size_in_bytes,
    downloadUrl: a.archive_download_url,
    createdAt: a.created_at,
  }));
}

// ──────────────────────────────────────────────────
// 4. BUSCAR RELEASES (software pronto)
// ──────────────────────────────────────────────────
export async function getLatestRelease(moduleName) {
  const response = await fetch(
    `${GITHUB_API}/repos/${REPO}/releases`,
    {
      headers: {
        Authorization: `Bearer ${PAT}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) return null;
  const releases = await response.json();

  const match = releases.find((r) =>
    r.tag_name.includes(moduleName)
  );

  if (!match) return null;

  return {
    tagName: match.tag_name,
    name: match.name,
    body: match.body,
    publishedAt: match.published_at,
    assets: match.assets.map((a) => ({
      name: a.name,
      size: a.size,
      downloadUrl: a.browser_download_url,
    })),
  };
}

// ──────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────

async function findLatestRun(workflowFile, traceId, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    await sleep(2000);

    const response = await fetch(
      `${GITHUB_API}/repos/${REPO}/actions/workflows/${workflowFile}/runs?per_page=5`,
      {
        headers: {
          Authorization: `Bearer ${PAT}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) continue;
    const data = await response.json();

    // Pegar o run mais recente (acabou de ser criado)
    if (data.workflow_runs?.length > 0) {
      return data.workflow_runs[0].id;
    }
  }

  throw new Error("Não encontrei o workflow run após várias tentativas");
}

function mapGitHubStatus(run) {
  if (run.status === "queued") return "queued";
  if (run.status === "in_progress") {
    // Tentar inferir a fase pelos jobs
    const name = run.name?.toLowerCase() || "";
    if (name.includes("pre-factory")) return "pre-factory";
    if (name.includes("factory")) return "pack1";
    return "pack0";
  }
  if (run.conclusion === "success") return "done";
  if (run.conclusion === "failure") return "failed";
  return "queued";
}

function phaseToProgress(phase) {
  const map = {
    queued: 0,
    "pre-factory": 15,
    blueprint: 30,
    pack0: 45,
    validate: 55,
    pack1: 70,
    promote: 85,
    export: 95,
    done: 100,
    failed: 0,
  };
  return map[phase] || 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────
// POLLING HOOK (para usar em React)
// ──────────────────────────────────────────────────
export function useFactoryPolling(buildId, intervalMs = 5000) {
  // Exemplo de uso no React:
  // const { status, phase, progress, artifacts } = useFactoryPolling(buildId);
  //
  // Implementação (precisa de useState/useEffect do React):
  // - Poll a cada intervalMs
  // - Parar quando status === "completed" || "failed"
  // - Retornar estado atualizado
  return { buildId, intervalMs }; // placeholder
}
