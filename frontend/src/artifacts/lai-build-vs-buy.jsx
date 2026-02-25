import { useState } from "react"

const LAYERS = [
  {
    id: 0,
    name: "Control Plane",
    color: "#22c55e",
    emoji: "🟢",
    tools: [
      {
        name: "Lovable",
        verdict: "KEEP",
        reason: "Já é nativo. Frontend builder.",
        cost: "$100-480/mês",
        nativeCost: "—",
      },
      {
        name: "Supabase",
        verdict: "KEEP",
        reason: "Já é core da arquitetura. Insubstituível.",
        cost: "$25/mês",
        nativeCost: "—",
      },
      {
        name: "Temporal Cloud",
        verdict: "BUILD",
        reason: "Supabase Edge Functions + pg_cron + tabela de estado = workflow engine nativo. Seu volume (300 franchising) não justifica $100+/mês.",
        cost: "$100+/mês",
        nativeCost: "$0 (já pago no Supabase)",
        buildPlan: "Edge Function 'workflow-engine': tabela workflows(id, steps_json, current_step, status, retries, next_at). pg_cron chama /functions/v1/workflow-tick a cada 30s. Retry automático com backoff. Para 250 usuários, é mais que suficiente.",
        agent: "workflow-orchestrator-agent",
        buildTime: "3 dias",
      },
      {
        name: "Upstash Redis",
        verdict: "BUILD",
        reason: "Supabase tem cache via unlogged tables + Realtime para pub/sub. Redis é luxo pro seu volume.",
        cost: "$10-200/mês",
        nativeCost: "$0",
        buildPlan: "Tabela cache_store(key, value_json, ttl, created_at) + function que limpa expirados. Para filas: tabela job_queue(id, payload, status, scheduled_at, picked_at, completed_at) + Edge Function worker.",
        agent: "queue-worker-agent",
        buildTime: "1 dia",
      },
      {
        name: "Upstash QStash",
        verdict: "BUILD",
        reason: "pg_cron + Edge Functions = cron + webhook delivery. Não precisa de QStash.",
        cost: "$1-180/mês",
        nativeCost: "$0",
        buildPlan: "pg_cron schedule → chama Edge Function → Edge Function faz HTTP POST para destino → registra resultado → retry se falhar. Tabela: scheduled_jobs + job_executions.",
        buildTime: "1 dia",
      },
      {
        name: "GitHub Actions",
        verdict: "KEEP",
        reason: "Core do pipeline. Insubstituível para CI/CD.",
        cost: "$0-50/mês",
        nativeCost: "—",
      },
      {
        name: "GitHub Advanced Security",
        verdict: "BUILD_PARTIAL",
        reason: "Secret scanning e SAST básico já existem na fábrica (leak_check.py + onca_scanner.py). CodeQL é o único que vale manter.",
        cost: "$19-30/committer/mês",
        nativeCost: "$0 (já construído)",
        buildPlan: "leak_check.py já faz secret scanning. onca_scanner.py já faz SAST básico. Adicionar: regex patterns para AWS/GCP/Azure keys + Supabase keys. Rodar como gate no GitHub Actions.",
        buildTime: "Já existe",
      },
      {
        name: "1Password",
        verdict: "KEEP",
        reason: "Segredos de equipe humana. Não replicável por agent.",
        cost: "$8/user/mês",
        nativeCost: "—",
      },
    ],
  },
  {
    id: 1,
    name: "Capture UI/Rede",
    color: "#3b82f6",
    emoji: "🔵",
    tools: [
      {
        name: "Playwright",
        verdict: "KEEP",
        reason: "Open-source, $0. Já é padrão. Sem motivo para substituir.",
        cost: "$0",
        nativeCost: "—",
      },
      {
        name: "mitmproxy",
        verdict: "KEEP",
        reason: "Open-source, $0. Captura HAR. Essencial.",
        cost: "$0",
        nativeCost: "—",
      },
      {
        name: "BrowserStack",
        verdict: "CUT",
        reason: "Para 250 usuários em 1 browser (Chrome), Playwright local + GitHub Actions basta. Cross-browser é luxo nessa fase.",
        cost: "$129+/mês",
        nativeCost: "$0",
        buildPlan: "Playwright no GitHub Actions já roda Chrome, Firefox, WebKit. 3 browsers cobertos. Adicionar matrix no workflow: browser: [chromium, firefox, webkit].",
        buildTime: "30 min",
      },
      {
        name: "Flow Recorder",
        verdict: "BUILD",
        reason: "Seu modelo de IA + Playwright traces = documentação automática de fluxos. Melhor que Flow Recorder.",
        cost: "$20-100/mês",
        nativeCost: "$0",
        buildPlan: "Agent que: 1) Recebe trace.zip do Playwright, 2) Extrai screenshots + HAR, 3) Usa IA local para descrever cada step em português, 4) Gera Markdown com imagens. Salva no Supabase Storage.",
        agent: "flow-documenter-agent",
        buildTime: "2 dias",
      },
    ],
  },
  {
    id: 2,
    name: "Extract Config",
    color: "#a855f7",
    emoji: "🟣",
    tools: [
      {
        name: "HubSpot API",
        verdict: "KEEP",
        reason: "API gratuita. Não faz sentido substituir.",
        cost: "$0",
        nativeCost: "—",
      },
      {
        name: "Airbyte Cloud",
        verdict: "BUILD",
        reason: "Para 1 source (HubSpot) → 1 destino (Supabase), um Edge Function com schedule faz o mesmo. Airbyte é overkill.",
        cost: "$10+/mês",
        nativeCost: "$0",
        buildPlan: "Edge Function 'hubspot-sync': pg_cron a cada 6h → chama HubSpot API → upsert no Supabase. Tabelas: sync_runs(id, source, status, records_synced, errors, started_at). Seu modelo de IA mapeia schema automaticamente.",
        agent: "data-sync-agent",
        buildTime: "2 dias",
      },
    ],
  },
  {
    id: 3,
    name: "Contratos/OpenAPI",
    color: "#ef4444",
    emoji: "🔴",
    tools: [
      {
        name: "Stoplight",
        verdict: "BUILD",
        reason: "A fábrica já gera OpenAPI specs. Lovable pode renderizar a doc. IA gera mocks. Stoplight é UI bonita pra algo que já existe no repo.",
        cost: "$44-56/mês",
        nativeCost: "$0",
        buildPlan: "1) Clone Engineer já gera openapi.yaml no Pack1. 2) Edge Function serve a spec como Swagger UI (swagger-ui CDN). 3) Mock server: Edge Function lê openapi.yaml e retorna exemplos. 4) IA valida spec contra implementação.",
        agent: "contract-guardian-agent",
        buildTime: "2 dias",
      },
      {
        name: "Postman",
        verdict: "BUILD",
        reason: "Edge Function + Lovable frontend = API tester nativo. Postman é conveniente mas não essencial.",
        cost: "$14-29/user/mês",
        nativeCost: "$0",
        buildPlan: "Componente Lovable: input URL + method + headers + body → fetch → mostra response. Salva coleções no Supabase. Histórico de requests. Exporta como cURL.",
        buildTime: "1 dia",
      },
      {
        name: "Spectral/openapi-diff/AJV",
        verdict: "KEEP",
        reason: "Open-source, $0. Rodam no CI. Perfeito.",
        cost: "$0",
        nativeCost: "—",
      },
      {
        name: "Schemathesis",
        verdict: "KEEP",
        reason: "Open-source. Gera testes de contrato automaticamente. Essencial.",
        cost: "$0",
        nativeCost: "—",
      },
    ],
  },
  {
    id: 4,
    name: "Modelagem",
    color: "#eab308",
    emoji: "🟡",
    tools: [
      {
        name: "XState",
        verdict: "KEEP",
        reason: "Open-source, $0. Library, não serviço.",
        cost: "$0",
        nativeCost: "—",
      },
      {
        name: "Mermaid/PlantUML",
        verdict: "BUILD_ENHANCE",
        reason: "Já usamos Mermaid. Adicionar: IA gera diagramas automaticamente a partir do blueprint.",
        cost: "$0",
        nativeCost: "$0",
        buildPlan: "Agent que recebe SRS.json do Pack0 → gera Mermaid diagrams (ERD, sequence, flowchart) → salva no repo. IA local faz o trabalho.",
        agent: "diagram-generator-agent",
        buildTime: "1 dia",
      },
    ],
  },
  {
    id: 5,
    name: "Parity Gate",
    color: "#f97316",
    emoji: "🟠",
    tools: [
      {
        name: "Applitools",
        verdict: "BUILD",
        reason: "Para 1:1 HubSpot, você precisa de visual regression. Mas: Playwright screenshots + seu modelo de IA comparando = Applitools caseiro. $969/mês é absurdo pro seu volume.",
        cost: "$699-969/mês",
        nativeCost: "$0",
        buildPlan: "1) Playwright tira screenshot de cada tela (baseline). 2) Após mudança, tira novo screenshot. 3) IA local compara pixel-diff + layout-diff + color-diff. 4) Gera relatório: 'Tela X: 98.7% match, divergência em botão Y'. 5) Gate: se match < 95%, bloqueia deploy.",
        agent: "visual-parity-agent",
        buildTime: "3 dias",
      },
      {
        name: "Chromatic",
        verdict: "BUILD",
        reason: "Storybook visual testing. Playwright + IA faz o mesmo para componentes isolados.",
        cost: "$179-399/mês",
        nativeCost: "$0",
        buildPlan: "Mesma lógica do visual-parity-agent mas rodando por componente no Storybook. Screenshot each story → compare with baseline → report.",
        buildTime: "Incluso no visual-parity-agent",
      },
    ],
  },
  {
    id: 6,
    name: "Observabilidade",
    color: "#6b7280",
    emoji: "⚫️",
    tools: [
      {
        name: "Sentry",
        verdict: "BUILD",
        reason: "Edge Function que captura erros do frontend (window.onerror) + backend (try/catch). Tabela no Supabase. Dashboard no Lovable. Para 250 usuários, Sentry é canhão para mosca.",
        cost: "$26-89/mês",
        nativeCost: "$0",
        buildPlan: "1) Frontend: global error handler → POST /functions/v1/errors. 2) Tabela: error_events(id, type, message, stack, url, user_id, metadata, created_at). 3) Dashboard: top errors, trend, por usuário. 4) Alertas: se errors > N em 5min → notifica.",
        agent: "error-tracker-agent",
        buildTime: "2 dias",
      },
      {
        name: "Datadog",
        verdict: "BUILD_BASIC",
        reason: "Para 250 usuários, structured logging + Supabase queries + dashboard Lovable = observabilidade suficiente. Datadog a $36/host/mês é enterprise demais.",
        cost: "$36+/host/mês",
        nativeCost: "$0",
        buildPlan: "1) Tabelas: api_logs(request_id, method, path, status, duration_ms, tenant_id, created_at), metrics(name, value, labels, ts). 2) Dashboard: latência P50/P95/P99, requests/min, errors/min, top endpoints. 3) pg_cron agrega métricas diárias. 4) Realtime para alertas.",
        agent: "observability-agent",
        buildTime: "3 dias",
      },
      {
        name: "PagerDuty",
        verdict: "BUILD",
        reason: "Para equipe pequena, notificação por webhook (Telegram/WhatsApp/Email) resolve. PagerDuty é para times de 50+ on-call.",
        cost: "$21-49/user/mês",
        nativeCost: "$0",
        buildPlan: "Edge Function 'alert-dispatcher': quando metric > threshold → envia webhook para Telegram bot + email via Supabase Auth mailer. Tabela: alerts(id, severity, message, acknowledged, channel, sent_at).",
        agent: "alert-dispatcher-agent",
        buildTime: "1 dia",
      },
    ],
  },
  {
    id: 7,
    name: "Segurança",
    color: "#6366f1",
    emoji: "🛡",
    tools: [
      {
        name: "Semgrep",
        verdict: "BUILD",
        reason: "onca_scanner.py + leak_check.py já fazem SAST básico. Adicionar patterns do OWASP Top 10 com regex + IA review. Semgrep a $40/contributor é caro.",
        cost: "$40+/contributor/mês",
        nativeCost: "$0",
        buildPlan: "Expandir onca_scanner.py: 1) OWASP patterns (SQL injection, XSS, SSRF). 2) Dependency check (parse package.json/requirements.txt → verificar CVEs via API pública). 3) IA local review do diff antes do merge. Roda como gate no CI.",
        agent: "security-scanner-agent",
        buildTime: "2 dias",
      },
      {
        name: "Snyk",
        verdict: "CUT",
        reason: "Trivy (open-source, $0) + security-scanner-agent cobre 90% do que Snyk faz. Snyk é nice-to-have.",
        cost: "$25+/mês",
        nativeCost: "$0",
      },
      {
        name: "Trivy/Gitleaks",
        verdict: "KEEP",
        reason: "Open-source, $0. Rodam no CI. Essenciais.",
        cost: "$0",
        nativeCost: "—",
      },
    ],
  },
  {
    id: 8,
    name: "IA Assistida",
    color: "#0ea5e9",
    emoji: "🔑",
    tools: [
      {
        name: "GitHub Copilot",
        verdict: "REPLACE",
        reason: "Seu modelo de IA open-source + Clone Engineer DNA = Copilot próprio. Copilot a $19-39/user/mês é custo desnecessário.",
        cost: "$19-39/user/mês",
        nativeCost: "$0 (modelo local)",
        buildPlan: "1) Clone Engineer como code review agent no PR. 2) Modelo local via API para sugestões. 3) VS Code extension que chama seu servidor (ou usa Continue com BYOK). O Clone Engineer já tem DNA de estilo VS5, melhor que Copilot genérico.",
        agent: "code-review-agent",
        buildTime: "2 dias",
      },
      {
        name: "Cursor",
        verdict: "CUT",
        reason: "Modelo local + Continue (open-source) = Cursor. Sem custo.",
        cost: "$20-40/user/mês",
        nativeCost: "$0",
      },
    ],
  },
  {
    id: 9,
    name: "Design System",
    color: "#ec4899",
    emoji: "🎨",
    tools: [
      {
        name: "Figma",
        verdict: "KEEP",
        reason: "Insubstituível para design visual. Não tente replicar.",
        cost: "$12-55/user/mês",
        nativeCost: "—",
      },
    ],
  },
  {
    id: 10,
    name: "Knowledge/Vector DB",
    color: "#14b8a6",
    emoji: "🗄",
    tools: [
      {
        name: "Pinecone",
        verdict: "BUILD",
        reason: "Supabase tem pgvector nativo. ZERO motivo para pagar Pinecone. pgvector + Supabase = vector DB gratuito, já integrado.",
        cost: "$50+/mês",
        nativeCost: "$0 (pgvector no Supabase)",
        buildPlan: "1) Habilitar extensão pgvector no Supabase. 2) Tabela: knowledge_embeddings(id, content, metadata, embedding vector(1536)). 3) Edge Function: recebe texto → chama modelo local para embedding → upsert. 4) Busca: SELECT * ORDER BY embedding <=> query_embedding LIMIT 10. 5) Indexa: docs, fluxos, contratos, run reports.",
        agent: "knowledge-indexer-agent",
        buildTime: "2 dias",
      },
      {
        name: "Apify",
        verdict: "BUILD",
        reason: "Para scraping estruturado, Playwright headless + IA para parsing = Apify caseiro. Para seu volume, Playwright basta.",
        cost: "$29-999/mês",
        nativeCost: "$0",
        buildPlan: "Agent que: 1) Playwright navega URL, 2) Extrai HTML, 3) IA local estrutura dados em JSON, 4) Salva no Supabase. Schedule via pg_cron.",
        agent: "web-scraper-agent",
        buildTime: "2 dias",
      },
    ],
  },
]

function Badge({ verdict }) {
  const styles = {
    BUILD: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    BUILD_PARTIAL: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    BUILD_ENHANCE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    BUILD_BASIC: "bg-teal-500/20 text-teal-400 border-teal-500/30",
    KEEP: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    CUT: "bg-red-500/20 text-red-400 border-red-500/30",
    REPLACE: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  }
  const labels = {
    BUILD: "🔨 CONSTRUIR NATIVO",
    BUILD_PARTIAL: "🔧 PARCIAL NATIVO",
    BUILD_ENHANCE: "⬆️ MELHORAR EXISTENTE",
    BUILD_BASIC: "🔨 CONSTRUIR BÁSICO",
    KEEP: "✅ MANTER EXTERNO",
    CUT: "✂️ CORTAR",
    REPLACE: "🔄 SUBSTITUIR POR IA LOCAL",
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[verdict] || styles.KEEP}`}>
      {labels[verdict] || verdict}
    </span>
  )
}

function ToolCard({ tool, expanded, onToggle }) {
  const isBuild = tool.verdict.startsWith("BUILD") || tool.verdict === "REPLACE"
  return (
    <div className={`rounded-xl border transition-all ${
      isBuild ? "border-emerald-500/30 bg-emerald-500/5" :
      tool.verdict === "CUT" ? "border-red-500/20 bg-red-500/5 opacity-60" :
      "border-white/10 bg-white/5"
    }`}>
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-white text-sm">{tool.name}</h4>
              <Badge verdict={tool.verdict} />
            </div>
            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{tool.reason}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-gray-500">SaaS: <span className="text-red-400">{tool.cost}</span></p>
            {tool.nativeCost && tool.nativeCost !== "—" && (
              <p className="text-xs text-gray-500">Nativo: <span className="text-emerald-400">{tool.nativeCost}</span></p>
            )}
          </div>
        </div>
        {expanded && tool.buildPlan && (
          <div className="mt-3 p-3 bg-black/30 rounded-lg border border-white/5">
            <p className="text-xs font-bold text-emerald-400 mb-1">
              📋 Como construir {tool.buildTime && `(${tool.buildTime})`}:
            </p>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{tool.buildPlan}</p>
            {tool.agent && (
              <p className="text-xs text-blue-400 mt-2 font-mono">Agent: {tool.agent}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [expanded, setExpanded] = useState({})
  const [filter, setFilter] = useState("all")

  const toggle = (layerId, toolIdx) => {
    const key = `${layerId}-${toolIdx}`
    setExpanded(e => ({ ...e, [key]: !e[key] }))
  }

  // Calculate totals
  const allTools = LAYERS.flatMap(l => l.tools)
  const buildable = allTools.filter(t => t.verdict.startsWith("BUILD") || t.verdict === "REPLACE")
  const cuttable = allTools.filter(t => t.verdict === "CUT")
  const keepable = allTools.filter(t => t.verdict === "KEEP")

  const parseCost = (s) => {
    if (!s || s === "$0" || s === "—") return 0
    const m = s.match(/\$(\d+[\d,.]*)/);
    return m ? parseFloat(m[1].replace(",", "")) : 0
  }
  const savedPerMonth = [...buildable, ...cuttable].reduce((s, t) => s + parseCost(t.cost), 0)

  const agents = buildable.filter(t => t.agent)

  const filtered = filter === "all" ? LAYERS : LAYERS.map(l => ({
    ...l,
    tools: l.tools.filter(t =>
      filter === "build" ? (t.verdict.startsWith("BUILD") || t.verdict === "REPLACE") :
      filter === "keep" ? t.verdict === "KEEP" :
      filter === "cut" ? t.verdict === "CUT" : true
    )
  })).filter(l => l.tools.length > 0)

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0a0f1a 0%, #111827 100%)" }}>
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #10b981)" }}>
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <h1 className="text-xl font-bold text-white">LAI Factory — Build vs Buy</h1>
          </div>
          <p className="text-gray-500 text-sm">36 ferramentas analisadas · {buildable.length} construíveis nativamente</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* SUMMARY */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{buildable.length}</p>
            <p className="text-xs text-emerald-300/60 mt-1">Construir nativo</p>
          </div>
          <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{keepable.length}</p>
            <p className="text-xs text-gray-400/60 mt-1">Manter externo</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{cuttable.length}</p>
            <p className="text-xs text-red-300/60 mt-1">Cortar</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">~${savedPerMonth.toLocaleString()}</p>
            <p className="text-xs text-blue-300/60 mt-1">Economia/mês</p>
          </div>
        </div>

        {/* AGENTS REGISTRY */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-emerald-400 mb-3">🤖 {agents.length} Agents a construir (IA open-source local)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {agents.map((t, i) => (
              <div key={i} className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
                <span className="text-emerald-400 text-xs">●</span>
                <span className="text-xs font-mono text-gray-300">{t.agent}</span>
                <span className="ml-auto text-xs text-gray-500">{t.buildTime}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Total estimado: ~3 semanas para todos os agents · Economia: ~${savedPerMonth}/mês recorrente
          </p>
        </div>

        {/* FILTER */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {[
            { key: "all", label: "Todos (36)" },
            { key: "build", label: `Construir (${buildable.length})` },
            { key: "keep", label: `Manter (${keepable.length})` },
            { key: "cut", label: `Cortar (${cuttable.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors
              ${filter === f.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* LAYERS */}
        <div className="space-y-6">
          {filtered.map(layer => (
            <div key={layer.id}>
              <div className="flex items-center gap-2 mb-3">
                <span>{layer.emoji}</span>
                <h2 className="font-bold text-white text-sm">Camada {layer.id} — {layer.name}</h2>
                <span className="text-xs text-gray-600 ml-auto">{layer.tools.length} tools</span>
              </div>
              <div className="space-y-2">
                {layer.tools.map((tool, j) => (
                  <ToolCard key={j} tool={tool}
                    expanded={expanded[`${layer.id}-${j}`]}
                    onToggle={() => toggle(layer.id, j)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM SUMMARY */}
        <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4">📊 Resumo executivo</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400 mt-0.5">✓</span>
              <p className="text-gray-300">
                <strong className="text-white">{buildable.length} ferramentas</strong> substituíveis por agents nativos usando seu modelo de IA open-source + Supabase + Edge Functions.
                Economia de <strong className="text-emerald-400">~${savedPerMonth}/mês</strong>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 mt-0.5">→</span>
              <p className="text-gray-300">
                <strong className="text-white">{agents.length} agents</strong> para construir em ~3 semanas.
                Cada agent usa: modelo IA local (custo $0) + Supabase (já pago) + Edge Functions (já pago).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-gray-400 mt-0.5">○</span>
              <p className="text-gray-300">
                <strong className="text-white">Manter externo:</strong> Supabase, GitHub, Lovable, Figma, 1Password, Playwright, mitmproxy, XState, Trivy, Spectral, Schemathesis.
                Motivo: ou é $0 (open-source) ou é insubstituível.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">✕</span>
              <p className="text-gray-300">
                <strong className="text-white">Cortar:</strong> BrowserStack, Snyk, Cursor.
                Motivo: redundantes com o que já existe ou vai existir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
