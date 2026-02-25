import { useState } from "react"

// ══════════════════════════════════════════════════════════════
// LAI INTELLIGENCE LAYER — Agentes Bisbilhoteiros + 3 Barreiras
// ══════════════════════════════════════════════════════════════

const ROAMING_AGENTS = [
  {
    id: "behavior-tracker",
    name: "Behavior Tracker",
    emoji: "👁️",
    role: "Observa como cada pessoa usa cada tela",
    how: `Injeta um micro-script no frontend (30 linhas). Captura:
• Cliques (onde, frequência, ordem)
• Tempo em cada tela
• Campos que preenche e campos que ignora
• Fluxos que começa e abandona
• Erros que encontra e como contorna
• Copy/paste (de onde, pra onde)
• Exportações para Excel (sinal de que falta feature)

Salva em: user_behavior_events(user_id, event_type, metadata, screen, timestamp)
IA analisa padrões semanalmente.`,
    output: "Relatório: 'Maria gasta 40min/dia copiando dados da tela X pro Excel. Automatizável em 2h.'",
    supabaseTable: "user_behavior_events",
    impact: "Descobre processos manuais que NINGUÉM reporta porque 'sempre foi assim'",
  },
  {
    id: "friction-detector",
    name: "Friction Detector",
    emoji: "🔥",
    role: "Detecta onde o usuário sofre",
    how: `Analisa behavior_events e identifica:
• Rage clicks (clicou 5x no mesmo lugar em 3s)
• Dead clicks (clicou onde não tem ação)
• Backtrack (foi pra tela, voltou, foi de novo)
• Slow paths (fluxo que deveria levar 30s leva 5min)
• Error loops (tentou, errou, tentou igual, errou igual)
• Workarounds (abriu nova aba, copiou ID, colou no filtro)

IA classifica severidade: 🔴 Crítico / 🟡 Médio / 🟢 Baixo`,
    output: "Alerta: 'Tela de Deals tem 340 rage clicks/semana. Botão de salvar não dá feedback visual.'",
    supabaseTable: "friction_events",
    impact: "UX melhora sem pesquisa — o sistema observa e corrige",
  },
  {
    id: "process-miner",
    name: "Process Miner",
    emoji: "⛏️",
    role: "Mapeia processos reais vs processos desenhados",
    how: `Combina behavior_events de todos os usuários e reconstrói:
• O fluxo REAL que as pessoas fazem (não o que foi desenhado)
• Variantes (Maria faz A→B→C, João faz A→C→B)
• Gargalos (todos param 5min na mesma tela)
• Handoffs (tarefa passa de pessoa pra pessoa como?)
• Loops (aprovação vai e volta 3x antes de fechar)

Usa: Process Mining algorithm (directly-follows graph)
Gera: Mermaid diagram do processo REAL`,
    output: "Mapa: 'O processo de aprovação de deal tem 7 steps reais (desenhamos 4). O step 5 é gargalo — 60% do tempo total.'",
    supabaseTable: "process_traces",
    impact: "Descobre que o processo real é diferente do que a empresa ACHA que faz",
  },
  {
    id: "automation-scout",
    name: "Automation Scout",
    emoji: "🤖",
    role: "Sugere automatizações baseado em padrões",
    how: `IA analisa todos os dados dos outros agents e identifica:
• Tarefas repetitivas (mesma sequência > 3x/semana)
• Copy/paste entre sistemas (sempre copia de A pra B)
• Decisões previsíveis (sempre aprova quando valor < X)
• Notificações manuais (sempre manda email quando status muda)
• Relatórios montados à mão (sempre exporta, filtra, formata)

Para cada padrão, gera proposta:
{ tarefa, frequência, tempo_gasto, automação_sugerida, tempo_dev, roi_mensal }

Prioriza por ROI: economia_hora × frequência ÷ tempo_dev`,
    output: "Proposta: 'Automatizar relatório semanal de pipeline. Hoje: 2h/semana manual. Automação: Edge Function + PDF + email. Dev: 4h. ROI: 8h/mês.'",
    supabaseTable: "automation_proposals",
    impact: "A empresa se auto-otimiza. O sistema PROPÕE melhorias ao invés de esperar alguém pedir.",
  },
  {
    id: "system-health-rover",
    name: "System Health Rover",
    emoji: "🛸",
    role: "Percorre toda infra checando saúde",
    how: `A cada hora, faz ronda completa:
• Supabase: tabelas crescendo? queries lentas? RLS ativo? storage cheio?
• Edge Functions: latência? erros? rate limits atingidos?
• GitHub: PRs abertos há muito tempo? Actions falhando?
• Frontend: bundle size? erros de console? performance (LCP/FID)?
• Banco: dead rows? índices não usados? queries sem índice?
• Segurança: tokens expirando? permissões excessivas?

Compara com baseline e alerta desvios.`,
    output: "Alerta: 'Tabela contacts cresceu 300% em 7 dias. Query de busca degradou de 12ms para 340ms. Sugestão: adicionar índice composto em (tenant_id, name, status).'",
    supabaseTable: "system_health_checks",
    impact: "Problemas detectados ANTES do usuário perceber",
  },
  {
    id: "cost-watcher",
    name: "Cost Watcher",
    emoji: "💸",
    role: "Monitora gastos e prevê estouros",
    how: `Coleta de todas as APIs de billing:
• Supabase: egress, storage, compute, function invocations
• Vercel: bandwidth, builds, serverless invocations
• Anthropic: tokens consumidos por build
• GitHub Actions: minutos usados

Projeta: "No ritmo atual, você vai gastar $X este mês"
Alerta: "Egress Supabase subiu 40% — investigue endpoint /api/contacts"
Sugere: "Comprimir respostas JSON economizaria $12/mês de egress"`,
    output: "Report: 'Custo projetado: $87 (budget: $100). Anthropic = $45 (50% do total). Sugestão: cachear prompts repetidos, economia estimada: $15/mês.'",
    supabaseTable: "cost_tracking",
    impact: "Nunca mais surpresa na fatura",
  },
  {
    id: "knowledge-harvester",
    name: "Knowledge Harvester",
    emoji: "📚",
    role: "Coleta conhecimento tácito das conversas e decisões",
    how: `Monitora:
• Decisões tomadas em PRs (comments, approvals)
• Padrões que o Clone Engineer aplica repetidamente
• Erros corrigidos no self-healing (o que falhou e como corrigiu)
• Perguntas feitas por usuários (chat/suporte)
• Regras de negócio implícitas nos dados

Indexa tudo com embeddings (pgvector) e cria:
• FAQ automático
• Dicionário de termos do negócio
• Mapa de decisões arquiteturais (ADRs automáticos)`,
    output: "ADR gerado: 'Decisão: Deals com valor > R$50k exigem aprovação do gerente. Evidência: 100% dos deals nessa faixa foram aprovados manualmente. Sugestão: criar gate automático.'",
    supabaseTable: "knowledge_base",
    impact: "Conhecimento tácito vira explícito. Ninguém é insubstituível.",
  },
]

const BARRIERS = [
  {
    number: 1,
    title: "Memória Cumulativa Composta",
    subtitle: "Cada build torna o próximo melhor. Impossível de copiar sem rodar 1.000 builds.",
    icon: "🧠",
    color: "from-violet-600 to-purple-700",
    problem: "Hoje a fábrica gera código bom. Mas cada build é independente. Ela não APRENDE com os builds anteriores.",
    solution: `FEEDBACK LOOP FECHADO:

1. Cada build gera: código + testes + erros + correções + métricas
2. Tudo vira embedding no pgvector
3. Próximo build CONSULTA builds anteriores antes de gerar código:
   "Para módulos tipo CRM, a fábrica errou em X nas primeiras 10 vezes. Agora já sabe evitar."

4. Self-healing acumula: cada erro corrigido vira REGRA permanente
   "Nunca mais gere SELECT * sem LIMIT quando tabela > 10k rows"

5. Padrões de código que passam nos gates viram TEMPLATES preferidos
   "Este pattern de RLS funciona 100% das vezes. Use como default."

6. Feedback do usuário (rage clicks, friction) volta pro prompt do Clone Engineer:
   "Usuários não encontram o botão de filtro. Próxima geração: botão maior, cor contrastante."`,
    whyBarrier: `Depois de 1.000 builds, sua fábrica sabe:
• 847 patterns que funcionam
• 312 erros que não comete mais
• 156 regras de negócio específicas de franchising
• 89 preferências de UX dos seus usuários

Um concorrente precisaria rodar 1.000 builds PRA CHEGAR ONDE VOCÊ JÁ ESTÁ.
E enquanto ele roda, você já rodou mais 1.000.
É compound interest aplicado a software.`,
    implementation: `Tabelas:
• build_learnings(id, module_type, pattern, category, confidence, source_build_id)
• error_corrections(id, error_pattern, correction, success_rate, applied_count)
• code_templates(id, name, code, pass_rate, usage_count, last_used)
• ux_feedback_rules(id, screen, rule, source, applied_in_builds)

Agent: learning-accumulator
Roda após cada build. Extrai learnings. Indexa em pgvector.
Clone Engineer consulta antes de gerar.`,
  },
  {
    number: 2,
    title: "DNA de Domínio Vertical",
    subtitle: "A fábrica não gera software genérico. Ela gera software de franchising.",
    icon: "🧬",
    color: "from-emerald-600 to-teal-700",
    problem: "Lovable, Replit, Bolt geram código genérico. Servem pra TODO MUNDO. Não servem PERFEITAMENTE pra ninguém.",
    solution: `ESPECIALIZAÇÃO VERTICAL:

1. A fábrica absorve o DOMÍNIO do 300 Franchising:
   • Vocabulário: royalty, taxa de franquia, COF, DRE, unidade, master, multi-unidade
   • Entidades: Franqueado, Unidade, Contrato, Território, Indicador
   • Fluxos: Processo seletivo → Aprovação → Implantação → Operação → Expansão
   • Regulação: Lei 13.966, COF obrigatória, prazo de 10 dias
   • Métricas: Ticket médio, CAC por unidade, churn de franqueado, NPS rede

2. O Clone Engineer fala franchising:
   • Prompt: "Crie módulo de gestão" → Gera com entidades de franchising por default
   • Sabe que "unidade" tem CNPJ, contrato, território, indicadores
   • Sabe que "royalty" é % sobre faturamento com mínimo
   • Gera relatórios no formato que a ABF espera

3. O knowledge_base indexa tudo do setor:
   • Contratos-modelo, COFs, regulamentação
   • Melhores práticas da ABF
   • Cases de outras redes (público)
   • Indicadores benchmark do setor`,
    whyBarrier: `Um concorrente precisa:
1. Entender franchising (6 meses estudando)
2. Mapear entidades e fluxos (3 meses)
3. Codificar regulação (2 meses)
4. Validar com operadores reais (3 meses)
= 14 meses antes de COMEÇAR

Você já tem o domínio. A fábrica ABSORVE esse domínio.
Cada build reforça o DNA vertical.
Em 6 meses, ninguém alcança.

Isso é o que separa:
• "Fábrica de software genérica" (Lovable, Replit — qualquer um tem)
• "Fábrica de software de franchising" (SÓ VOCÊ TEM)`,
    implementation: `Tabelas:
• domain_entities(id, name, attributes, relationships, source)
• domain_rules(id, rule, regulation_ref, mandatory, validated_by)
• domain_vocabulary(id, term, definition, synonyms, context)
• domain_templates(id, module_type, entities, flows, vertical)

Agent: domain-absorber
Lê documentos do setor, extracts entidades/regras, indexa.
Clone Engineer consulta domain_rules antes de gerar.`,
  },
  {
    number: 3,
    title: "Cadeia de Confiança Autônoma",
    subtitle: "Não-técnico descreve → software em produção. Com PROVA de que funciona.",
    icon: "🔗",
    color: "from-amber-600 to-orange-700",
    problem: "O gap do mercado: Lovable gera frontend bonito mas não deploya backend. Replit deploya mas sem testes. Devin testa mas precisa de dev revisando. NINGUÉM fecha o loop com PROVA de qualidade.",
    solution: `CADEIA DE CONFIANÇA (Trust Chain):

Cada software gerado vem com CERTIFICADO:

{
  "module": "crm-contacts",
  "trust_score": 94.2,
  "evidence": {
    "tests_passed": "47/47 (100%)",
    "security_gates": "5/5 passed",
    "rls_verified": true,
    "visual_parity": "97.3%",
    "performance": "P95 < 200ms",
    "self_healing_rounds": 2,
    "errors_fixed": ["missing index", "wrong RLS policy"],
    "code_review": "Clone Engineer VS5 compliant",
    "leak_check": "0 secrets found",
    "audit_trail": "PEC chain: 3 approvals"
  },
  "signed_by": "LAI Factory V014",
  "timestamp": "2026-02-25T12:00:00Z"
}

O NÃO-TÉCNICO vê:
✅ Score 94/100
✅ 47 testes passaram
✅ Segurança verificada
✅ Performance OK
✅ Sem dados vazados
✅ Código revisado por IA

ELE CONFIA porque tem PROVA.
O dev não precisa revisar porque os GATES já revisaram.`,
    whyBarrier: `Isso é o que falta em TODAS as ferramentas:
• Lovable: "confie em mim, o código tá bom" (sem prova)
• Replit: "rodei, funcionou" (sem teste de segurança)
• Bolt: "gerou, deployou" (sem audit trail)

Sua fábrica: "Aqui está o software, aqui está a PROVA de que funciona,
aqui está cada decisão que a IA tomou, aqui está o que ela corrigiu."

Para um franqueador de 300 unidades, isso é COMPLIANCE.
Para investidor, isso é GOVERNANÇA.
Para regulador, isso é AUDITABILIDADE.

Ninguém no mundo tem isso hoje.
O primeiro que tiver, ganha o mercado.`,
    implementation: `Tabelas:
• trust_certificates(id, module, version, trust_score, evidence_json, signed_at)
• gate_results(id, build_id, gate_name, passed, details, duration_ms)
• audit_decisions(id, build_id, decision, reason, agent, timestamp)

Agent: trust-certifier
Roda no final de cada build.
Coleta resultados de todos os gates.
Calcula trust_score.
Gera certificado assinado.
Front mostra pro não-técnico.`,
  },
]

const SHOULD_HAVE_ASKED = [
  {
    question: "Como a fábrica aprende com cada build que roda?",
    why: "Sem feedback loop, cada build é o primeiro. Você nunca acumula vantagem.",
    impact: "CRÍTICO — é a diferença entre ferramenta e plataforma",
  },
  {
    question: "Como garanto que não-técnico CONFIA no software gerado sem revisar código?",
    why: "Se alguém precisa revisar, você não automatizou — só moveu o gargalo.",
    impact: "CRÍTICO — é o produto inteiro",
  },
  {
    question: "O que torna isso impossível de copiar em menos de 12 meses?",
    why: "Se qualquer um com Lovable + Claude replica em 1 semana, não é defensável.",
    impact: "CRÍTICO — é a barreira de entrada",
  },
  {
    question: "Como os agentes de observação alimentam o Clone Engineer automaticamente?",
    why: "Sem esse loop, observar é só dashboard bonito. COM o loop, o software se auto-melhora.",
    impact: "ALTO — fecha o ciclo observe → learn → improve → observe",
  },
  {
    question: "Qual é o unit economics de cada módulo gerado pela fábrica?",
    why: "Custo de gerar (API tokens + compute) vs valor entregue (horas de dev economizadas) = ROI real.",
    impact: "ALTO — prova que o modelo é viável financeiramente",
  },
  {
    question: "Como faço o franchising pagar pela fábrica sem saber que existe uma fábrica?",
    why: "O franqueado paga pelo SOFTWARE, não pela fábrica. A fábrica é vantagem competitiva INTERNA.",
    impact: "ALTO — modelo de negócio",
  },
]

function AgentCard({ agent, isOpen, onToggle }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-sm">{agent.name}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{agent.role}</p>
          </div>
          <span className="text-gray-600 text-xs">{isOpen ? "▲" : "▼"}</span>
        </div>
      </div>
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-black/30 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-400 mb-1">Como funciona:</p>
            <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">{agent.how}</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <p className="text-xs font-bold text-emerald-400 mb-1">Output exemplo:</p>
            <p className="text-xs text-emerald-300/80">{agent.output}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Tabela: <code className="text-blue-400">{agent.supabaseTable}</code></span>
          </div>
          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
            <p className="text-xs font-bold text-amber-400">💡 Impacto real:</p>
            <p className="text-xs text-amber-300/80">{agent.impact}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function BarrierCard({ barrier }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl overflow-hidden border border-white/10">
      <div className={`bg-gradient-to-r ${barrier.color} p-6 cursor-pointer`} onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{barrier.icon}</span>
          <div>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">Barreira #{barrier.number}</p>
            <h3 className="text-xl font-bold text-white">{barrier.title}</h3>
            <p className="text-white/70 text-sm mt-1">{barrier.subtitle}</p>
          </div>
        </div>
      </div>
      {open && (
        <div className="bg-white/5 p-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">❌ Problema hoje</p>
            <p className="text-sm text-gray-300">{barrier.problem}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">✅ Solução</p>
            <pre className="text-xs text-gray-300 whitespace-pre-line bg-black/30 rounded-lg p-4 leading-relaxed overflow-x-auto">{barrier.solution}</pre>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">🛡️ Por que é barreira intransponível</p>
            <pre className="text-xs text-gray-300 whitespace-pre-line bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 leading-relaxed">{barrier.whyBarrier}</pre>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2">🔧 Implementação</p>
            <pre className="text-xs text-gray-300 whitespace-pre-line bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 leading-relaxed font-mono">{barrier.implementation}</pre>
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [openAgents, setOpenAgents] = useState({})
  const [tab, setTab] = useState("agents")

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #060a12 0%, #0f172a 50%, #060a12 100%)" }}>
      <header className="border-b border-white/10 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-white">LAI Intelligence Layer</h1>
          <p className="text-gray-500 text-sm mt-1">Agentes bisbilhoteiros + 3 barreiras de entrada + o que você deveria ter perguntado</p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { key: "agents", label: "👁️ 7 Agentes Bisbilhoteiros" },
            { key: "barriers", label: "🛡️ 3 Barreiras de Entrada" },
            { key: "questions", label: "❓ O Que Deveria Ter Perguntado" },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${tab === t.key ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 pb-12">
        {tab === "agents" && (
          <div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 mb-6">
              <p className="text-blue-400 font-bold text-sm mb-2">O conceito:</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                7 agentes autônomos que rodam 24/7 usando sua IA local. 
                Custam $0/mês. Observam TUDO. Cada um alimenta o próximo.
                O Automation Scout transforma as observações em propostas concretas com ROI calculado.
                O Knowledge Harvester garante que nenhuma decisão ou aprendizado se perde.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <span className="text-emerald-400">●</span> Todos rodam em: Supabase Edge Functions + pg_cron + IA local
                <span className="ml-4 text-emerald-400">●</span> Custo total: $0/mês
              </div>
            </div>

            <div className="mb-4 bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fluxo de dados entre agents</p>
              <div className="text-xs text-gray-500 font-mono leading-loose">
                <span className="text-blue-400">Behavior Tracker</span> → captura eventos brutos<br/>
                <span className="text-orange-400">Friction Detector</span> → analisa eventos → identifica dor<br/>
                <span className="text-purple-400">Process Miner</span> → reconstrói fluxos reais<br/>
                <span className="text-emerald-400">Automation Scout</span> → propõe automatizações com ROI<br/>
                <span className="text-cyan-400">System Health Rover</span> → monitora infra<br/>
                <span className="text-yellow-400">Cost Watcher</span> → monitora gastos<br/>
                <span className="text-pink-400">Knowledge Harvester</span> → indexa tudo em pgvector<br/>
                <br/>
                <span className="text-white">↓ Tudo alimenta o Clone Engineer no próximo build ↓</span>
              </div>
            </div>

            <div className="space-y-3">
              {ROAMING_AGENTS.map(a => (
                <AgentCard key={a.id} agent={a}
                  isOpen={openAgents[a.id]}
                  onToggle={() => setOpenAgents(o => ({ ...o, [a.id]: !o[a.id] }))} />
              ))}
            </div>
          </div>
        )}

        {tab === "barriers" && (
          <div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-6">
              <p className="text-amber-400 font-bold text-sm mb-2">A pergunta real:</p>
              <p className="text-gray-300 text-sm leading-relaxed">
                "O que faz esse projeto impossível de copiar?" — Não é a tecnologia (Supabase, Claude, GitHub são públicos). 
                São estas 3 coisas que ACUMULAM com o tempo. Quanto mais roda, mais impossível de alcançar.
              </p>
            </div>
            <div className="space-y-4">
              {BARRIERS.map(b => <BarrierCard key={b.number} barrier={b} />)}
            </div>

            <div className="mt-6 bg-white/5 border border-white/10 rounded-xl p-5">
              <p className="text-white font-bold text-sm mb-3">O efeito combinado:</p>
              <div className="text-sm text-gray-300 space-y-2">
                <p>
                  <strong className="text-violet-400">Barreira 1</strong> (Memória) faz a fábrica ficar melhor a cada build.
                </p>
                <p>
                  <strong className="text-emerald-400">Barreira 2</strong> (DNA de Domínio) faz ela gerar software que 
                  SÓ FAZ SENTIDO para franchising — genéricos não competem.
                </p>
                <p>
                  <strong className="text-amber-400">Barreira 3</strong> (Trust Chain) faz o não-técnico CONFIAR 
                  sem dev — o produto final vira acessível para 300 franqueados.
                </p>
                <p className="text-white font-bold mt-4">
                  As 3 juntas = a maior fábrica de software coerente do mundo no vertical de franchising.
                  Não porque é a mais avançada tecnicamente — mas porque é a única que APRENDE, ESPECIALIZA e PROVA.
                </p>
              </div>
            </div>
          </div>
        )}

        {tab === "questions" && (
          <div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 mb-6">
              <p className="text-red-400 font-bold text-sm mb-2">O que você deveria ter me perguntado:</p>
              <p className="text-gray-300 text-sm">
                Você me pediu código, deploy, ferramentas. Tudo certo. 
                Mas as perguntas abaixo mudam o JOGO — não o tabuleiro.
              </p>
            </div>
            <div className="space-y-3">
              {SHOULD_HAVE_ASKED.map((q, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      q.impact === "CRÍTICO" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                    }`}>{q.impact}</span>
                    <div>
                      <p className="text-white font-bold text-sm">"{q.question}"</p>
                      <p className="text-gray-400 text-xs mt-1.5">{q.why}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
              <p className="text-emerald-400 font-bold text-sm mb-2">O que implementar AGORA (ordem de prioridade):</p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold w-6">1.</span>
                  <p className="text-gray-300"><strong className="text-white">Behavior Tracker</strong> — 30 linhas no frontend. Começa a coletar dados HOJE. Sem dados, os outros agents não funcionam.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold w-6">2.</span>
                  <p className="text-gray-300"><strong className="text-white">Trust Certificate</strong> — Adicionar no final do pipeline. Cada build gera certificado. É o PRODUTO que vende a fábrica.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold w-6">3.</span>
                  <p className="text-gray-300"><strong className="text-white">Learning Accumulator</strong> — Após cada build, extrair learnings e indexar em pgvector. É o que cria a barreira #1.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold w-6">4.</span>
                  <p className="text-gray-300"><strong className="text-white">Domain Absorber</strong> — Alimentar com documentos de franchising (COF, contratos, regulação). É a barreira #2.</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-emerald-400 font-bold w-6">5.</span>
                  <p className="text-gray-300"><strong className="text-white">Automation Scout</strong> — Só funciona depois que os outros coletaram dados por 2+ semanas.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
